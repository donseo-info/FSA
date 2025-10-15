if (!window.externalAPI) {
    externalApiPolyfill();
}

function externalApiPolyfill() {
    const YMI = window.$YMI;

    const REPEAT_VALUES_MAP = {
        'none': false,
        'context': true,
        'one': 1,
    };

    function buttonSelector(link, parent = document) {
        return parent.querySelector(`button:has([*|href^="#${link}"])`);
    }

    function playerBarSelector() {
        return document.querySelector('[class*=\'PlayerBarDesktop_root\']');
    }

    function menuSelector() {
        return document.querySelector('[data-floating-ui-portal]');
    }

    async function openMenu() {
        if (!menuSelector()) {
            buttonSelector('more', playerBarSelector())?.click();
            await waitFor(() => menuSelector());
        }
        return menuSelector();
    }

    async function waitFor(cb, timeout = 100) {
        return new Promise(resolve => {
            function check() {
                if (cb()) {
                    return resolve();
                }
                setTimeout(check, timeout);
            }
            check();
        });
    }

    window.externalAPI = {
        getProgress() {
            const progress = YMI.state.playerState.progress.value;
            const {duration, loaded, position} = progress;
            return {
                duration,
                loaded,
                position,
            };
        },
        setPosition(value) {
            YMI.setProgress(value);
        },
        getRepeat() {
            return REPEAT_VALUES_MAP[YMI.state.queueState.repeat.value] ?? false;
        },
        toggleRepeat(state) {
            let repeatKey;
            if (state) {
                const item = Object.entries(REPEAT_VALUES_MAP).find(([, value]) => value === state);
                if (!item) {
                    throw new TypeError(`toggleRepeat unknown value, available values: ${JSON.stringify(Object.values(REPEAT_VALUES_MAP))}`);
                }
                repeatKey = item[0];
            } else {
                const currentValue = this.getRepeat();
                let currentValueIndex = Object.entries(REPEAT_VALUES_MAP).findIndex(([, value]) => value === currentValue);
                if (currentValueIndex + 1 < Object.keys(REPEAT_VALUES_MAP).length) {
                    repeatKey = Object.entries(REPEAT_VALUES_MAP)[currentValueIndex + 1][0];
                } else {
                    repeatKey = Object.entries(REPEAT_VALUES_MAP)[0][0];
                }
            }
            YMI.setRepeatMode(repeatKey);
        },
        getShuffle() {
            return YMI.state.queueState.shuffle.value;
        },
        toggleShuffle() {
            YMI.setShuffle(!this.getShuffle());
        },
        getVolume() {
            return YMI.state.playerState.volume.value;
        },
        setVolume(volume) {
            //note: via code volume works, but interface is not reacting
            YMI.setVolume(volume);
        },
        toggleMute() {
            if (this.getVolume() > 0) {
                buttonSelector('volume')?.click();
                //note: via code mute works, but interface is not reacting
                //localStorage.setItem('Ya_Music_Player_Volume', this.getVolume())
                //this.setVolume(0)
            } else {
                //this.setVolume(localStorage.getItem('Ya_Music_Player_Volume') ?? 1)
                buttonSelector('volumeOff')?.click();
            }
        },
        isPlaying() {
            return YMI.state?.playerState?.status?.value === 'playing';
        },
        togglePause(state) {
            if (state === undefined) {
                YMI.togglePause();
            } else if (state === true && !this.isPlaying()) {
                YMI.resume();
            } else if (state === false && this.isPlaying()) {
                YMI.pause();
            }
        },
        async toggleDislike() {
            const isDisliked = YMI.state.queueState.currentEntity.value.entity.isDisliked;
            const menu = await openMenu();
            if (!isDisliked) {
                buttonSelector('dislike', menu)?.click();
            } else {
                buttonSelector('disliked', menu)?.click();
            }
        },
        async toggleLike() {
            const playerBar = playerBarSelector();
            const currentEntity = YMI.state.queueState.currentEntity.value.entity;
            const isLiked = currentEntity.likeStore.tracks.items.has(currentEntity.entityData.meta.realId);
            if (!isLiked) {
                const likeBtnInBar = buttonSelector('like', playerBar);
                if (likeBtnInBar) {
                    likeBtnInBar.click();
                } else {
                    const menu = await openMenu();
                    buttonSelector('like', menu).click();
                }
            } else {
                const unlinkBtnInBar = buttonSelector('liked', playerBar);
                if (unlinkBtnInBar) {
                    unlinkBtnInBar.click();
                } else {
                    const menu = await openMenu();
                    buttonSelector('liked', menu).click();
                }
            }
        },
        getControls() {
            //null - hidden @deprecated
            //false - disabled
            //true - enabled
            const {availableActions} = YMI.state.currentContext.value;

            const play = true;
            const next = availableActions.moveForward.value;
            const prev = availableActions.moveBackward.value;
            const shuffle = availableActions.shuffle.value;
            const repeat = availableActions.repeat.value;
            const like = true;
            const dislike = true;

            return {
                play,
                next,
                prev,
                shuffle,
                repeat,
                like,
                dislike,
            };
        },
        getCurrentTrack() {
            const currentEntity = YMI.state.queueState.currentEntity.value.entity;
            const isLiked = currentEntity.likeStore.tracks.items.get(currentEntity.entityData.meta.realId) === '1';
            const isDisliked = currentEntity.isDisliked;
            const title = currentEntity.entityData.meta.title;
            const duration = currentEntity.entityData.meta.durationMs / 1000;
            const album = currentEntity.entityData.meta.albums.length ? currentEntity.entityData.meta.albums[0] : undefined;
            const id = currentEntity.entityData.meta.id;
            const cover = currentEntity.entityData.meta.coverUri;
            const version = currentEntity.entityData.meta.version;
            const artists = currentEntity.entityData.meta.artists.map(artist => {
                return {
                    cover: artist.cover?.uri,
                    link: artist.id ? `/artist/${artist.id}` : undefined,
                    title: artist.name,
                };
            });

            return {
                album: album ? {
                    artists: album.artists.map(artist => {
                        return {
                            cover: artist.cover?.uri,
                            link: artist.id ? `/artist/${artist.id}` : undefined,
                            title: artist.name,
                        };
                    }),
                    cover: album.coverUri,
                    link: `/album/${album.id}`,
                    title: album.title,
                    year: album.year,
                } : undefined,
                artists,
                cover,
                disliked: isDisliked,
                duration,
                liked: isLiked,
                link: album ? `/album/${album.id}/track/${id}` : undefined,
                title,
                version,
            };
        },
        getTracksList() {
            //Пока тут используется только кол-во
            return {
                length: YMI.state.queueState.entityList.value.length,
            };
        },
        navigate(url) {
            window.next.router.push(url)
        },
        next() {
            YMI.moveForward();
        },
        prev() {
            YMI.moveBackward();
        },
        async on(event, cb) {
            switch (event) {
                case this.EVENT_CONTROLS: {
                    //Тут пока не ясно, не плодятся ли лишние колбэки
                    YMI.state.currentContext.onChange(() => {
                        YMI.state.currentContext.value.availableActions.moveForward.onChange(() => cb()) //availability
                        YMI.state.currentContext.value.availableActions.moveBackward.onChange(() => cb()) //availability
                        YMI.state.currentContext.value.availableActions.shuffle.onChange(() => cb()) //availability
                        YMI.state.currentContext.value.availableActions.repeat.onChange(() => cb()) //availability
                        YMI.state.queueState.shuffle.onChange(() => cb()) //value
                        YMI.state.queueState.repeat.onChange(() => cb()) //value
                        cb();
                    })
                    break;
                }
                case this.EVENT_STATE: {
                    YMI.state.playerState.status.onChange(() => cb())
                    break;
                }
                case this.EVENT_TRACK: {
                    const {currentEntity} = YMI.state.queueState
                    currentEntity.onChange(() => cb()) //on track change
                    currentEntity.value.entity.likeStore.tracks.items.changeListeners_.push(() => cb()) //on (dis)like change
                    break;
                }
                case this.EVENT_TRACKS_LIST: {
                    YMI.state.queueState.entityList.onChange(() => cb())
                    break;
                }
                case this.EVENT_VOLUME: {
                    YMI.state.playerState.volume.onChange(() => cb())
                    break;
                }
                case this.EVENT_PROGRESS: {
                    YMI.state.playerState.progress.onChange(() => cb())
                    break;
                }
            }
        },
        EVENT_CONTROLS: 'controls',
        EVENT_STATE: 'state',
        EVENT_TRACK: 'track',
        EVENT_TRACKS_LIST: 'tracks',
        EVENT_VOLUME: 'volume',
        EVENT_PROGRESS: 'progress',
    };
    console.log('window.externalAPI polyfill is ready');
}
