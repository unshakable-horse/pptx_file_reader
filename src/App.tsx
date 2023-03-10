import {useEffect, useRef, useState} from "react";
import reactLogo from "./assets/react.svg";
import {invoke} from "@tauri-apps/api/tauri";
import "./App.css";
import 'antd/dist/reset.css'
import Editor, {DiffEditor, useMonaco, loader, Monaco} from "@monaco-editor/react";
import type {DataNode} from 'antd/es/tree'
import {Button, Layout, Tree} from "antd";
import {Content, Footer, Header} from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import {listen} from "@tauri-apps/api/event";
import {open} from "@tauri-apps/api/dialog"


const containerStyle: React.CSSProperties = {
    height: window.innerHeight
}

const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    color: '#565656',
    height: 32,
    paddingInline: 50,
    lineHeight: '32px',
    backgroundColor: '#F2F2F2',
    borderBottom: "solid 1px",
    borderTop: "solid 1px",
    borderColor: "#D0D0D0"
};
const siderStyle: React.CSSProperties = {
    textAlign: 'center',
    color: '#050505',
    height: 'inherit',
    overflow: 'scroll',
    backgroundColor: '#FFFFFF',
    borderRight: "solid 1px",
    borderColor: "#D0D0D0"
};

const contentStyle: React.CSSProperties = {
    minHeight: 120,
    height: 'inherit',
    overflow: 'scroll',
    whiteSpace: "pre",
    color: "#000000"

};


const initTreeData: DataNode[] = [];


function App() {
    const [treeData, setTreeData] = useState(initTreeData);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    useEffect(() => {
            const listen_file_drop = listen("tauri://file-drop", (event) => {
                let file_path: any = event.payload;
                setTitle(file_path);
                (async () => {
                    console.log(file_path);
                    let name = file_path.toString();
                    let nodes: DataNode[] = await invoke("greet", {name});
                    console.log("nodes", nodes);
                    setTreeData(nodes);
                    setContent("");
                })();
            });
            return () => {
                listen_file_drop.then(f => f());
            }
        }, []
    );

    useEffect(() => {
            const listen_file_drop = listen("open_file", async (event) => {
                let file_path = await open({
                    multiple: false,
                    filters: [{
                        name: 'PPTX',
                        extensions: ['pptx']
                    }]
                });
                console.log(file_path);

                if (file_path) {
                    let filePath = file_path.toString();
                    setTitle(filePath);
                    console.log(filePath);
                    (async () => {
                        let name = filePath.toString();
                        let nodes: DataNode[] = await invoke("greet", {name});
                        console.log("nodes", nodes);
                        setTreeData(nodes);
                        setContent("");
                    })();
                }

            });
            return () => {
                listen_file_drop.then(f => f());
            }
        }, []
    );


    document.onkeydown = (e: KeyboardEvent) => {
        if (e.code == "KeyF" && e.metaKey) {
            console.log("press ctrl+f");
        }
    }

    const onSelect = (selectedKeys: React.Key[], info: any) => {
        console.log(selectedKeys);
        let key = selectedKeys[0];

        (async () => {
            // setFilePath(key.toString());
            let content: string = await invoke("read_xml", {key});
            let pretty_xml = formatXml(content);
            console.log(pretty_xml);
            setContent(pretty_xml);

        })();

        console.log('selected', selectedKeys, info);
    };

    //??????????????? ????????????
    const setPrefix = (prefixIndex: any) => {
        var result = '';
        var span = '    ';//????????????
        var output = [];
        for (var i = 0; i < prefixIndex; ++i) {
            output.push(span);
        }
        result = output.join('');
        return result;
    }
    //?????????xml??????
    const formatXml = (xmlStr: any) => {
        let text = xmlStr;
        //??????replace?????????
        text = '\n' + text.replace(/(<\w+)(\s.*?>)/g, function ($0: any, name: any, props: any) {
            return name + ' ' + props.replace(/\s+(\w+=)/g, " $1");
        }).replace(/>\s*?</g, ">\n<");
        console.log("1", text);
        //????????????????????????????????????
        text = text.replace(/\n/g, '\r').replace(/<!--(.+?)-->/g, function ($0: any, text: any) {
            var ret = '<!--' + escape(text) + '-->';
            return ret;
        }).replace(/\r/g, '\n');
        console.log("2", text);
        //????????????  ?????????????????????????????????
        var rgx = /\n(<(([^\?]).+?)(?:\s|\s*?>|\s*?(\/)>)(?:.*?(?:(?:(\/)>)|(?:<(\/)\2>)))?)/mg;
        var nodeStack: any = [];
        var output = text.replace(rgx, function ($0: any, all: any, name: any, isBegin: any, isCloseFull1: any, isCloseFull2: any, isFull1: any, isFull2: any) {
            var isClosed = (isCloseFull1 == '/') || (isCloseFull2 == '/') || (isFull1 == '/') || (isFull2 == '/');
            var prefix = '';
            if (isBegin == '!') {//!??????
                prefix = setPrefix(nodeStack.length);
            } else {
                if (isBegin != '/') {///??????
                    prefix = setPrefix(nodeStack.length);
                    if (!isClosed) {//???????????????
                        nodeStack.push(name);
                    }
                } else {
                    nodeStack.pop();//??????
                    prefix = setPrefix(nodeStack.length);
                }
            }
            var ret = '\n' + prefix + all;
            return ret;
        });
        console.log("output", output);
        var prefixSpace = -1;
        var outputText = output.substring(1);
        //??????????????????
        outputText = outputText.replace(/\n/g, '\r').replace(/(\s*)<!--(.+?)-->/g, function ($0: any, prefix: any, text: any) {
            if (prefix.charAt(0) == '\r')
                prefix = prefix.substring(1);
            // ??????
            text = unescape(text).replace(/\r/g, '\n');
            var ret = '\n' + prefix + '<!--' + text.replace(/^\s*/mg, prefix) + '-->';
            return ret;
        });
        outputText = outputText.replace(/\s+$/g, '').replace(/\r/g, '\r\n');
        return outputText;
    }


    return (

        <Layout style={{width: '100%', height: '100%'}}>
            <Header style={headerStyle}>{title}</Header>
            <Layout>
                <Sider style={siderStyle}>
                    <Tree onSelect={onSelect} treeData={treeData}></Tree>
                </Sider>
                <Content style={contentStyle}>
                    <Editor
                        // height="98%"
                        // path={filePath}
                        defaultLanguage="xml"
                        onMount={(editor, monaco) => {
                            editor.updateOptions({readOnly: true})
                        }
                        }
                        value={content}
                    />
                </Content>
            </Layout>
        </Layout>
    );
}

export default App;
