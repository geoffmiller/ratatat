import { RatatatApp, InputParser, LayoutNode, renderTreeToBuffer } from './dist/index.js';
import Yoga from 'yoga-layout-prebuilt';

const app = new RatatatApp();
const input = new InputParser(process.stdin);
const { width, height } = app.getSize();

// 1. Build a Yoga Layout Tree
const rootNode = new LayoutNode();
rootNode.yogaNode.setWidth(width);
rootNode.yogaNode.setHeight(height);
rootNode.yogaNode.setJustifyContent(Yoga.JUSTIFY_CENTER);
rootNode.yogaNode.setAlignItems(Yoga.ALIGN_CENTER);
rootNode.bg = 17; // Navy Blue bg for the whole screen

// 2. Add a centered dialog box
const dialogNode = new LayoutNode();
dialogNode.yogaNode.setWidth(40);
dialogNode.yogaNode.setHeight(10);
dialogNode.yogaNode.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
dialogNode.yogaNode.setPadding(Yoga.EDGE_ALL, 2);
dialogNode.bg = 255; // White Dialog
rootNode.insertChild(dialogNode, 0);

// 3. Add Top Text
const titleNode = new LayoutNode();
titleNode.yogaNode.setHeight(1);
titleNode.text = "WELCOME TO RATATAT";
titleNode.fg = 1; // Red text
titleNode.styles = 1; // Bold
dialogNode.insertChild(titleNode, 0);

// 4. Add Bottom Text
const btnNode = new LayoutNode();
btnNode.yogaNode.setHeight(1);
btnNode.text = "[PRESS ENTER TO MOUNT]";
btnNode.fg = 2; // Green text
dialogNode.insertChild(btnNode, 1);

// Pre-calculate layout once
rootNode.calculateLayout(width, height);

app.on('render', (buffer: Uint32Array, w: number, h: number) => {
    // Just traverse the Yoga tree and paint to the buffer
    renderTreeToBuffer(rootNode, buffer, w, h);
});

input.on('exit', () => {
    input.stop();
    app.stop();
    process.exit(0);
});

input.start();
app.start();
