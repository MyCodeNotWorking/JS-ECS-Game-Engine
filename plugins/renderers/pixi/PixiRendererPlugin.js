import { Application, Graphics } from "pixi.js";

function addDebugCoordinateSystem(viewport, step = 100 ) {
    const g = new Graphics();
    viewport.addChild(g);

    const redraw = () => {
        const b = viewport.getVisibleBounds();

        const left = Math.floor(b.x / step) * step - step;
        const right = Math.ceil((b.x + b.width) / step) * step + step;
        const top = Math.floor(b.y / step) * step - step;
        const bottom = Math.ceil((b.y + b.height) / step) * step + step;

        g.clear();

        // grid
        for (let x = left; x <= right; x += step) {
            g.moveTo(x, top);
            g.lineTo(x, bottom);
        }
        g.stroke({ color: 0xffffff, alpha: 0.2, pixelLine: true });

        for (let y = top; y <= bottom; y += step) {
            g.moveTo(left, y);
            g.lineTo(right, y);
        }
        g.stroke({ color: 0xffffff, alpha: 0.2, pixelLine: true });

        // axes
        g.moveTo(0, top);
        g.lineTo(0, bottom);
        g.stroke({ color: 0xff0000, width: 2, pixelLine: true });

        g.moveTo(left, 0);
        g.lineTo(right, 0);
        g.stroke({ color: 0x00ff00, width: 2, pixelLine: true });

        // origin
        g.circle(0, 0, 4).fill({ color: 0xffff00 });
    };

    viewport.on("moved", redraw);
    viewport.on("zoomed", redraw);
    redraw();

    function destroy() {
    	viewport.off("moved", redraw);
    	viewport.off("zoomed", redraw);
    	viewport.removeChild(g);
    	g.destroy();
    }

    return { g, redraw, destroy };
}

function createAppManager(options = {}) {
    const config = {
        backgroundColor: "3a6eb2",
        antialias: true,
        designWidth: 800,
        designHeight: 600,
        ...options,
    };

    let app = null;
    let resizeHandler = null;

    async function initApp() {
        const { backgroundColor, antialias } = config;

        app = new Application();
        await app.init({
            resizeTo: window,
            backgroundColor,
            antialias,
        });

        return app;
    }

    function useApp() {
        if (!app) {
            throw new Error("Call initApp() before useApp().");
        }

        document.body.appendChild(app.canvas);

        const resize = () => {
            const { designWidth, designHeight } = config;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            const scale = Math.min(
                screenWidth / designWidth,
                screenHeight / designHeight
            );

            app.stage.scale.set(scale);
            app.stage.x = (screenWidth - designWidth * scale) / 2;
            app.stage.y = (screenHeight - designHeight * scale) / 2;
        };

        resizeHandler = resize;
        resize();
        window.addEventListener("resize", resize);
    }

    function destroyApp() {
        if (!app) return;

        if (resizeHandler) {
            window.removeEventListener("resize", resizeHandler);
        }

        app.ticker.stop();
        app.stage.removeAllListeners();
        app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
        });

        app = null;
        resizeHandler = null;
    }

    return {
        initApp,
        useApp,
        destroyApp,
        get app() {
            return app;
        },
    };
}

function createPixiRenderer(installOptions = {}) {
    const manager = createAppManager();

    return {
        app: null,
        debugSystems: [],

        addDebugCoordinateSystem(viewport, step) {
        	const debugSystem = addDebugCoordinateSystem(viewport, step);
        	this.debugSystems.push(debugSystem);
        	return debugSystem;
        },

        async init(options = {}) {
            this.app = await manager.initApp(options);
        },

        install(world) { // not possible to pass another argument because the engine src does not allow this. This might be a problem
            if (!this.app) {
                throw new Error(
                    "You need to run the init method of the pixi renderer plugin first in order to use this plugin."
                );
            }

            manager.useApp(installOptions);
        },

        uninstall() {
            manager.destroyApp();
            this.app = null;
            this.debugSystems.forEach(debugSystem => {
            	debugSystem.destroy();
            });
            this.debugSystems = [];
        },
    };
}

export default createPixiRenderer;