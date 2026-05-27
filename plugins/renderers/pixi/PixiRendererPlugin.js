import { Application, Graphics } from "pixi.js";

async function createApp(options = {}) {
	const {
		designWidth = 800,
		designHeight = 600,
		backgroundColor = 0x111111,
		antialias = true
	} = options;

	const app = new Application();
	await app.init({
		resizeTo: window,   
		backgroundColor,
		antialias,
	});

	document.body.appendChild(app.canvas);

	const DESIGN_WIDTH = 800;
	const DESIGN_HEIGHT = 600;

	/*
	Debug box to ensure that this plugin is working
	const box = new Graphics().rect(0, 0, 200, 150).fill("aqua")
	box.x = DESIGN_WIDTH / 2 - 100;
	box.y = DESIGN_HEIGHT / 2 - 75;
	app.stage.addChild(box);*/

	function resize() {
		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;

		const scale = Math.min(
		    screenWidth / DESIGN_WIDTH,
		    screenHeight / DESIGN_HEIGHT
		);

		app.stage.scale.set(scale);

		app.stage.x = (screenWidth - DESIGN_WIDTH * scale) / 2;
		app.stage.y = (screenHeight - DESIGN_HEIGHT * scale) / 2;
	}

	app._resizeHandler = resize;
	resize();
	window.addEventListener('resize', resize);

	return app;
}

function destroyApp(app) {
	if (!app) return;

	window.removeEventListener('resize', app._resizeHandler);
	app.ticker.stop();
	app.stage.removeAllListeners();
	app.destroy(true, {
	    children: true,
	    texture: true,
	    baseTexture: true
	});
}

function createPixiRenderer(options = {}) {
    return {
        app: null,

        async init(options) {
            this.app = await createApp(options);
        },

        install(world) {},  // sync, nothing to do — init already ran

        uninstall(world) {
            destroyApp(this.app);
            this.app = null;
        }
    };
}

export default createPixiRenderer;