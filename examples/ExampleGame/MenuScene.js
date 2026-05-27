import { Container, Text, Graphics } from 'pixi.js';

const DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = 600;

function createMenuScene({ app, onStart }) {
    let container = null;

    function buildUI() {
        container = new Container();

        // Title
        const title = new Text({
            text: 'My Game',
            style: {
                fontFamily: 'Arial',
                fontSize: 72,
                fontWeight: 'bold',
                fill: 0xffffff,
            },
        });
        title.anchor.set(0.5);
        title.x = DESIGN_WIDTH / 2;
        title.y = DESIGN_HEIGHT / 2 - 80;

        // Start button
        const button = buildButton('Start Game', () => onStart?.());
        button.x = DESIGN_WIDTH / 2 - 100;
        button.y = DESIGN_HEIGHT / 2 + 20;

        container.addChild(title, button);
        app.stage.addChild(container);
    }

    return {
        enter(world, data) {
            buildUI();
        },

        exit(world, data) {
            container.destroy({ children: true });
            container = null;
        },
    };
}

function buildButton(label, onClick) {
    const W = 200;
    const H = 60;
    const RADIUS = 12;
    const COLOR_DEFAULT = 0x4488ff;
    const COLOR_HOVER = 0x66aaff;
    const COLOR_PRESSED = 0x2266dd;

    const button = new Graphics();

    function draw(color) {
        button.clear();
        button.roundRect(0, 0, W, H, RADIUS).fill(color);
    }

    draw(COLOR_DEFAULT);

    const text = new Text({
        text: label,
        style: {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
        },
    });
    text.anchor.set(0.5);
    text.x = W / 2;
    text.y = H / 2;
    button.addChild(text);

    button.eventMode = 'static';
    button.cursor = 'pointer';

    button.on('pointerover',  () => draw(COLOR_HOVER));
    button.on('pointerout',   () => draw(COLOR_DEFAULT));
    button.on('pointerdown',  () => draw(COLOR_PRESSED));
    button.on('pointerup',    () => { draw(COLOR_HOVER); onClick(); });

    return button;
}

export default createMenuScene;