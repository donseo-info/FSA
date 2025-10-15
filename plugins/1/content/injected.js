function monkeyPatchChunk(args) {
    const [chunk] = args;
    const [, moduleIds] = chunk;
    for (const moduleId in moduleIds) {
        const original = moduleIds[moduleId];
        moduleIds[moduleId] = (e, t, r) => {
            original(e, t, r);
            for (const key of Object.keys(e.exports)) {
                if (e.exports[key]?.prototype?.stop && e.exports[key].prototype.stop.toString().includes('mediaController')) {
                    e.exports[key].prototype._stop = e.exports[key].prototype.stop;
                    e.exports[key].prototype.stop = function(...args) {
                        if (!window.$YMI) {
                            window.$YMI = this;
                            //console.log('window.$YMI');
                            window.postMessage({type: 'YMI_READY'}, '*');
                        }
                        this._stop.apply(this, args);
                        e.exports[key].prototype.stop = e.exports[key].prototype._stop;
                        delete e.exports[key].prototype._stop;
                    };
                }
            }
        };
    }
    return [chunk];
}

(async () => {
    if (!!document.querySelector('script[id="config-env"]')) {
        //new
        await new Promise(resolve => {
            let i = 0;
            const check = timeout => window.webpackChunk_N_E ? resolve(true) : setTimeout(() => check(timeout), timeout * i++);
            check(4);
        });
        const _push = window.webpackChunk_N_E.push;
        window.webpackChunk_N_E.push = (...args) => {
            _push.apply(window.webpackChunk_N_E, monkeyPatchChunk(args));
        };
    } else {
        //old
        await new Promise(resolve => {
            let i = 0;
            const check = timeout => window.externalAPI ? resolve(true) : setTimeout(() => check(timeout), timeout * i++);
            check(4);
        });
        setTimeout(() => {
            window.postMessage({type: 'YMI_READY'}, '*');
        });
    }
})();
