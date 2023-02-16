#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]

mod menu;

use std::{collections::HashMap, fs::File};
use std::io::Read;

use serde::Serialize;
use zip::ZipArchive;
use crate::menu::init;

#[derive(Debug)]
struct Path {
    parts: Vec<String>,
}

impl Path {
    pub fn new(path: &str) -> Path {
        Path {
            parts: path.to_string().split("/").map(|s| s.to_string()).collect(),
        }
    }
}

// A recursive type to represent a directory tree.
// Simplification: If it has children, it is considered
// a directory, else considered a file.
#[derive(Debug, Clone, Serialize)]
struct Dir {
    title: String,
    key: String,
    children: Vec<Dir>,
    selectable: bool,
    disabled: bool,
}

impl Dir {
    fn new(name: &str, key: &str) -> Dir {
        Dir {
            title: name.to_string(),
            key: key.to_string(),
            children: Vec::<Dir>::new(),
            selectable: false,
            disabled:true
        }
    }

    fn find_child(&mut self, name: &str) -> Option<&mut Dir> {
        for c in self.children.iter_mut() {
            if &c.title == name {
                return Some(c);
            }
        }
        None
    }

    fn add_child<T>(&mut self, leaf: T) -> &mut Self
        where
            T: Into<Dir>,
    {
        self.children.push(leaf.into());
        self
    }
}

fn dir(val: &str, key: &str) -> Dir {
    Dir::new(val, key)
}

pub static mut CURRENT_ZIP: Option<ZipArchive<File>> = None;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> Vec<Dir> {
    println!("greet execute");
    let zip_file = open(name);
    let file_names: Vec<Path> = zip_file
        .file_names()
        .map(|x| Path::new(x))
        .collect::<Vec<Path>>();
    let mut top = dir("root", "0");

    for (index, path) in file_names.iter().enumerate() {
        build_tree(&mut top, &path.parts, 0);
    }

    unsafe {
        CURRENT_ZIP = Some(zip_file);
    }
    top.children
}

#[tauri::command]
fn read_xml(key: &str) -> String {
    unsafe {
        let zip = CURRENT_ZIP.as_mut().unwrap();
        let mut file = zip.by_name(key).unwrap();
        let mut xml = String::new();
        let _ = file.read_to_string(&mut xml);
        xml
    }
}


fn build_tree(node: &mut Dir, parts: &Vec<String>, depth: usize) {
    if depth < parts.len() {
        node.disabled = false;

        let item = &parts[depth];

        let mut dir = match node.find_child(&item) {
            Some(d) => d,
            None => {
                let key = parts[..=depth].join("/");
                let d = Dir::new(&item, &key);
                node.add_child(d);
                match node.find_child(&item) {
                    Some(d2) => d2,
                    None => panic!("Got here!"),
                }
            }
        };
        build_tree(&mut dir, parts, depth + 1);
    } else {
        if node.title.ends_with(".xml") || node.title.ends_with(".rels") {
            node.selectable = true;
            node.disabled = false;
        }
    }
}


#[derive(Serialize)]
struct TreeNode {
    title: String,
    key: String,
    children: Vec<TreeNode>,
}

pub fn open(path: &str) -> ZipArchive<File> {
    let file: File = File::open(path).unwrap();
    let zip: ZipArchive<File> = ZipArchive::new(file).unwrap();
    return zip;
}

#[derive(Serialize, Clone)]
struct Payload {
    message: Option<String>,
}

fn main() {
    let context = tauri::generate_context!();

    tauri::Builder::default()
        .menu(init(&context))
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "open_file" => {
                    let _ = event.window().emit("open_file", Payload { message: None });
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![greet,read_xml])
        .run(context)
        .expect("error while running tauri application");
}
