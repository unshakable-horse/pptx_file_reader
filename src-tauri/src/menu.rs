use tauri::{AboutMetadata, Context, CustomMenuItem, Menu, MenuItem, NativeImage, Submenu, WindowMenuEvent};
use tauri::utils::assets::EmbeddedAssets;

pub fn init(context:&Context<EmbeddedAssets>)->Menu{
    // 应用名称
    let name = &context.package_info().name;
    // tauri::Menu::os_default(name)
    // 应用主菜单
    let app_menu = Submenu::new(
        "",
        // MenuItem::About 为原生菜单
        Menu::new().add_native_item(MenuItem::About("PPTX Reader".to_string(), AboutMetadata::new())),
    );

    // 文件菜单（自定义菜单）
    let file_menu = Submenu::new(
        "File",
        Menu::new()
            .add_item(CustomMenuItem::new("open_file".to_string(), "Open").native_image(NativeImage::Slideshow))

    );


    Menu::new()
        .add_submenu(app_menu)
        .add_submenu(file_menu)
}


