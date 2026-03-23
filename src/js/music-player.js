// Music Player - Aeron Fav Songs

const MusicPlayer = {
    songs: [
        { id: 1, name: '23 - Cheema Y', file: 'assets/songs/23 - Cheema Y.mp3', artist: 'Cheema Y' },
        { id: 2, name: '52 Bars', file: 'assets/songs/52 Bars.mp3', artist: 'Sidhu Moosewala' },
        { id: 3, name: '5-7-1', file: 'assets/songs/5_7_1.mp3', artist: 'Karan Aujla' },
        { id: 4, name: '7-7 Magnitude', file: 'assets/songs/7_7_Magnitude_1.mp3', artist: 'Unknown' },
        { id: 5, name: 'At Peace', file: 'assets/songs/At_Peace_1.mp3', artist: 'AP Dhillon' },
        { id: 6, name: 'Daytona', file: 'assets/songs/Daytona_1.mp3', artist: 'Sidhu Moosewala' },
        { id: 7, name: 'Excuse Me', file: 'assets/songs/Excuse Me - Cheema Y.mp3', artist: 'Cheema Y' },
        { id: 8, name: 'I Really Do', file: 'assets/songs/I Really Do.mp3', artist: 'Unknown' },
        { id: 9, name: 'Nanak Niva Jo Challe', file: 'assets/songs/Nanak_Niva_Jo_Challe_1.mp3', artist: 'Bobby Sandhu' },
        { id: 10, name: 'Soch', file: 'assets/songs/Soch.mp3', artist: 'Karan Aujla' },
        { id: 11, name: 'Wavy', file: 'assets/songs/Wavy_1.mp3', artist: 'Karan Aujla' }
    ],

    currentSongIndex: 0,
    isPlaying: false,
    isShuffled: false,
    repeatMode: 'none', // 'none', 'one', 'all'
    audio: null,
    visualizerInterval: null,

    init() {
        // Create audio element if not exists
        if (!this.audio) {
            this.audio = new Audio();
            this.audio.addEventListener('ended', () => this.handleSongEnd());
            this.audio.addEventListener('timeupdate', () => this.updateProgress());
            this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
            this.audio.addEventListener('error', (e) => console.error('Audio error:', e));
        }
    },

    getWindowContent() {
        const songsList = this.songs.map((song, index) => `
            <div class="mp-song-item ${index === this.currentSongIndex && this.isPlaying ? 'playing' : ''}" 
                 data-index="${index}">
                <span class="mp-song-number">${index + 1}</span>
                <div class="mp-song-icon">🎵</div>
                <div class="mp-song-info">
                    <div class="mp-song-name">${song.name}</div>
                    <div class="mp-song-artist">${song.artist}</div>
                </div>
                <span class="mp-song-duration" data-index="${index}">--:--</span>
            </div>
        `).join('');

        const currentSong = this.songs[this.currentSongIndex];

        return `
            <div class="music-player">
                <div class="mp-header">
                    <div class="mp-title">
                        <span class="mp-title-icon">🎧</span>
                        Aeron Fav Songs
                    </div>
                    <div class="mp-controls-top">
                        <button class="mp-btn-shuffle ${this.isShuffled ? 'active' : ''}" title="Shuffle">
                            🔀
                        </button>
                        <button class="mp-btn-repeat ${this.repeatMode !== 'none' ? 'active' : ''}" 
                                title="Repeat: ${this.repeatMode}">
                            ${this.repeatMode === 'one' ? '🔂' : '🔁'}
                        </button>
                    </div>
                </div>
                
                <div class="mp-body">
                    <div class="mp-search">
                        <input type="text" class="mp-search-input" placeholder="🔍 Search songs...">
                    </div>
                    <div class="mp-playlist">
                        ${songsList}
                    </div>
                </div>

                <div class="mp-now-playing">
                    <div class="mp-now-playing-info">
                        <div class="mp-now-playing-cover ${this.isPlaying ? 'playing' : ''}">🎵</div>
                        <div class="mp-now-playing-details">
                            <div class="mp-now-playing-title">${currentSong.name}</div>
                            <div class="mp-now-playing-artist">${currentSong.artist}</div>
                        </div>
                        <div class="mp-visualizer ${this.isPlaying ? '' : 'paused'}">
                            <div class="mp-visualizer-bar" style="height: 8px;"></div>
                            <div class="mp-visualizer-bar" style="height: 16px;"></div>
                            <div class="mp-visualizer-bar" style="height: 12px;"></div>
                            <div class="mp-visualizer-bar" style="height: 20px;"></div>
                            <div class="mp-visualizer-bar" style="height: 14px;"></div>
                        </div>
                    </div>

                    <div class="mp-progress-container">
                        <div class="mp-progress-bar">
                            <div class="mp-progress" style="width: 0%"></div>
                        </div>
                        <div class="mp-time">
                            <span class="mp-current-time">0:00</span>
                            <span class="mp-total-time">--:--</span>
                        </div>
                    </div>

                    <div class="mp-controls">
                        <button class="mp-control-btn mp-prev-btn" title="Previous">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                            </svg>
                        </button>
                        <button class="mp-control-btn mp-play-btn" title="${this.isPlaying ? 'Pause' : 'Play'}">
                            ${this.isPlaying ? 
                                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>' :
                                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
                            }
                        </button>
                        <button class="mp-control-btn mp-next-btn" title="Next">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                            </svg>
                        </button>
                    </div>

                    <div class="mp-volume-container">
                        <span class="mp-volume-icon">🔊</span>
                        <input type="range" class="mp-volume-slider" min="0" max="100" value="${(this.audio?.volume || 0.7) * 100}">
                    </div>
                </div>
            </div>
        `;
    },

    initWindow(windowEl) {
        const player = windowEl.querySelector('.music-player');
        const playlist = player.querySelector('.mp-playlist');
        const searchInput = player.querySelector('.mp-search-input');
        const playBtn = player.querySelector('.mp-play-btn');
        const prevBtn = player.querySelector('.mp-prev-btn');
        const nextBtn = player.querySelector('.mp-next-btn');
        const progressBar = player.querySelector('.mp-progress-bar');
        const volumeSlider = player.querySelector('.mp-volume-slider');
        const shuffleBtn = player.querySelector('.mp-btn-shuffle');
        const repeatBtn = player.querySelector('.mp-btn-repeat');

        // Initialize audio
        this.init();

        // Song click handlers
        playlist.querySelectorAll('.mp-song-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.playSong(index, windowEl);
            });
        });

        // Search functionality
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            playlist.querySelectorAll('.mp-song-item').forEach(item => {
                const songName = item.querySelector('.mp-song-name').textContent.toLowerCase();
                const artist = item.querySelector('.mp-song-artist').textContent.toLowerCase();
                item.style.display = (songName.includes(query) || artist.includes(query)) ? '' : 'none';
            });
        });

        // Play/Pause
        playBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause(windowEl);
            } else {
                this.play(windowEl);
            }
        });

        // Previous/Next
        prevBtn.addEventListener('click', () => this.playPrevious(windowEl));
        nextBtn.addEventListener('click', () => this.playNext(windowEl));

        // Progress bar click
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (this.audio && this.audio.duration) {
                this.audio.currentTime = percent * this.audio.duration;
            }
        });

        // Volume slider
        volumeSlider.addEventListener('input', (e) => {
            if (this.audio) {
                this.audio.volume = e.target.value / 100;
            }
            this.updateVolumeIcon(windowEl);
        });

        // Shuffle
        shuffleBtn.addEventListener('click', () => {
            this.isShuffled = !this.isShuffled;
            shuffleBtn.classList.toggle('active', this.isShuffled);
        });

        // Repeat
        repeatBtn.addEventListener('click', () => {
            if (this.repeatMode === 'none') {
                this.repeatMode = 'all';
            } else if (this.repeatMode === 'all') {
                this.repeatMode = 'one';
            } else {
                this.repeatMode = 'none';
            }
            repeatBtn.classList.toggle('active', this.repeatMode !== 'none');
            repeatBtn.innerHTML = this.repeatMode === 'one' ? '🔂' : '🔁';
            repeatBtn.title = `Repeat: ${this.repeatMode}`;
        });

        // Keyboard shortcuts
        windowEl.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    if (this.isPlaying) this.pause(windowEl);
                    else this.play(windowEl);
                    break;
                case 'ArrowLeft':
                    if (this.audio) this.audio.currentTime -= 10;
                    break;
                case 'ArrowRight':
                    if (this.audio) this.audio.currentTime += 10;
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 10);
                    volumeSlider.dispatchEvent(new Event('input'));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 10);
                    volumeSlider.dispatchEvent(new Event('input'));
                    break;
            }
        });

        // Store window reference
        this.currentWindow = windowEl;

        // If already playing, update UI
        if (this.isPlaying) {
            this.updateUI(windowEl);
            this.startVisualizer(windowEl);
        }

        // Load song durations
        this.loadSongDurations(windowEl);
    },

    loadSongDurations(windowEl) {
        this.songs.forEach((song, index) => {
            const tempAudio = new Audio(song.file);
            tempAudio.addEventListener('loadedmetadata', () => {
                const durationEl = windowEl.querySelector(`.mp-song-duration[data-index="${index}"]`);
                if (durationEl) {
                    durationEl.textContent = this.formatTime(tempAudio.duration);
                }
            });
        });
    },

    playSong(index, windowEl) {
        this.currentSongIndex = index;
        const song = this.songs[index];
        
        if (this.audio) {
            this.audio.src = song.file;
            this.audio.load();
            this.play(windowEl);
        }
    },

    play(windowEl) {
        if (!this.audio.src) {
            this.audio.src = this.songs[this.currentSongIndex].file;
        }
        
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updateUI(windowEl);
            this.startVisualizer(windowEl);
        }).catch(e => console.error('Play error:', e));
    },

    pause(windowEl) {
        this.audio.pause();
        this.isPlaying = false;
        this.updateUI(windowEl);
        this.stopVisualizer(windowEl);
    },

    playNext(windowEl) {
        if (this.isShuffled) {
            this.currentSongIndex = Math.floor(Math.random() * this.songs.length);
        } else {
            this.currentSongIndex = (this.currentSongIndex + 1) % this.songs.length;
        }
        this.playSong(this.currentSongIndex, windowEl);
    },

    playPrevious(windowEl) {
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
        } else {
            this.currentSongIndex = (this.currentSongIndex - 1 + this.songs.length) % this.songs.length;
            this.playSong(this.currentSongIndex, windowEl);
        }
    },

    handleSongEnd() {
        const windowEl = this.currentWindow;
        if (!windowEl) return;

        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.play(windowEl);
        } else if (this.repeatMode === 'all' || this.currentSongIndex < this.songs.length - 1) {
            this.playNext(windowEl);
        } else {
            this.pause(windowEl);
        }
    },

    updateProgress() {
        const windowEl = this.currentWindow;
        if (!windowEl) return;

        const progress = windowEl.querySelector('.mp-progress');
        const currentTime = windowEl.querySelector('.mp-current-time');
        
        if (this.audio && this.audio.duration) {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            if (progress) progress.style.width = `${percent}%`;
            if (currentTime) currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    },

    updateDuration() {
        const windowEl = this.currentWindow;
        if (!windowEl) return;

        const totalTime = windowEl.querySelector('.mp-total-time');
        if (this.audio && totalTime) {
            totalTime.textContent = this.formatTime(this.audio.duration);
        }
    },

    updateUI(windowEl) {
        const song = this.songs[this.currentSongIndex];
        const playBtn = windowEl.querySelector('.mp-play-btn');
        const nowPlayingTitle = windowEl.querySelector('.mp-now-playing-title');
        const nowPlayingArtist = windowEl.querySelector('.mp-now-playing-artist');
        const nowPlayingCover = windowEl.querySelector('.mp-now-playing-cover');
        const visualizer = windowEl.querySelector('.mp-visualizer');

        // Update play button icon
        playBtn.innerHTML = this.isPlaying ? 
            '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>' :
            '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        playBtn.title = this.isPlaying ? 'Pause' : 'Play';

        // Update now playing info
        if (nowPlayingTitle) nowPlayingTitle.textContent = song.name;
        if (nowPlayingArtist) nowPlayingArtist.textContent = song.artist;

        // Update cover animation
        if (nowPlayingCover) {
            nowPlayingCover.classList.toggle('playing', this.isPlaying);
        }

        // Update visualizer
        if (visualizer) {
            visualizer.classList.toggle('paused', !this.isPlaying);
        }

        // Update playlist highlight
        windowEl.querySelectorAll('.mp-song-item').forEach((item, index) => {
            item.classList.toggle('playing', index === this.currentSongIndex && this.isPlaying);
        });
    },

    updateVolumeIcon(windowEl) {
        const volumeIcon = windowEl.querySelector('.mp-volume-icon');
        if (!volumeIcon) return;

        const volume = this.audio?.volume || 0;
        if (volume === 0) {
            volumeIcon.textContent = '🔇';
        } else if (volume < 0.3) {
            volumeIcon.textContent = '🔈';
        } else if (volume < 0.7) {
            volumeIcon.textContent = '🔉';
        } else {
            volumeIcon.textContent = '🔊';
        }
    },

    startVisualizer(windowEl) {
        this.stopVisualizer(windowEl);
        const bars = windowEl.querySelectorAll('.mp-visualizer-bar');
        
        this.visualizerInterval = setInterval(() => {
            bars.forEach(bar => {
                const height = Math.random() * 28 + 4;
                bar.style.height = `${height}px`;
            });
        }, 100);
    },

    stopVisualizer(windowEl) {
        if (this.visualizerInterval) {
            clearInterval(this.visualizerInterval);
            this.visualizerInterval = null;
        }
    },

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};
