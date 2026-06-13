class SoundPad {
    constructor() {
        this.sounds = [];
        this.audioElements = [];
        this.playingIndexes = new Set();
        this.editingIndex = null;
        this.editMode = false;
        this.keyMap = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o'];
        
        this.fileInput = document.getElementById('fileInput');
        this.editModeBtn = document.getElementById('editModeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.stopAllBtn = document.getElementById('stopAllBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.loadBtn = document.getElementById('loadBtn');
        this.projectFile = document.getElementById('projectFile');
        this.padGrid = document.getElementById('padGrid');
        
        this.modal = document.getElementById('editModal');
        this.closeBtn = document.querySelector('.close');
        this.saveEditBtn = document.getElementById('saveEditBtn');
        this.cancelEditBtn = document.getElementById('cancelEditBtn');
        this.deleteEditBtn = document.getElementById('deleteEditBtn');
        
        this.init();
        this.loadFromStorage();
    }

    init() {
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.editModeBtn.addEventListener('click', () => this.toggleEditMode());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.stopAllBtn.addEventListener('click', () => this.stopAll());
        this.saveBtn.addEventListener('click', () => this.saveProject());
        this.loadBtn.addEventListener('click', () => this.projectFile.click());
        this.projectFile.addEventListener('change', (e) => this.loadProject(e));
        
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        this.saveEditBtn.addEventListener('click', () => this.saveEdit());
        this.cancelEditBtn.addEventListener('click', () => this.closeModal());
        this.deleteEditBtn.addEventListener('click', () => this.deleteSound());
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        document.getElementById('editVolume').addEventListener('input', (e) => {
            document.getElementById('volumeValue').textContent = e.target.value;
        });
        
        document.getElementById('editPlaybackRate').addEventListener('input', (e) => {
            document.getElementById('playbackValue').textContent = (parseFloat(e.target.value).toFixed(1)) + 'x';
        });
        
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('editColor').value = btn.dataset.color;
            });
        });
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            const fileName = file.name.split('.')[0];
            
            this.sounds.push({
                id: Date.now() + Math.random(),
                name: fileName,
                url: url,
                color: '#667eea',
                loop: false,
                volume: 1,
                playbackRate: 1,
                hotkey: '',
                delay: 0
            });
        });
        
        this.renderPad();
        this.saveToStorage();
        this.fileInput.value = '';
    }

    renderPad() {
        this.padGrid.innerHTML = '';
        this.audioElements = [];
        
        this.sounds.forEach((sound, index) => {
            const button = document.createElement('div');
            button.className = `pad-button ${this.editMode ? 'edit-mode' : ''}`;
            button.style.background = `linear-gradient(135deg, ${sound.color} 0%, ${this.adjustBrightness(sound.color, -20)} 100%)`;
            
            const keyLabel = sound.hotkey || (this.keyMap[index] ? this.keyMap[index].toUpperCase() : '');
            
            const audio = new Audio(sound.url);
            audio.loop = sound.loop;
            audio.volume = sound.volume;
            audio.playbackRate = sound.playbackRate;
            this.audioElements[index] = audio;
            
            audio.addEventListener('ended', () => {
                this.playingIndexes.delete(index);
                this.updatePadStatus(index);
            });
            
            let statusText = '';
            
            if (this.editMode) {
                button.innerHTML = `
                    <div class="pad-top">
                        <div class="pad-name">${sound.name}</div>
                        <div class="pad-delete-btn">✕</div>
                    </div>
                    <div class="pad-controls">
                        <button class="pad-edit-btn">⚙️ Редакт.</button>
                    </div>
                    <div class="pad-status">${statusText}</div>
                `;
                
                button.querySelector('.pad-edit-btn').addEventListener('click', () => this.openEditModal(index));
                button.querySelector('.pad-delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteSound(index);
                });
            } else {
                button.innerHTML = `
                    <div class="pad-top">
                        <div class="pad-name">${sound.name}</div>
                        ${keyLabel ? `<div class="pad-key">[${keyLabel}]</div>` : ''}
                    </div>
                    <div class="pad-controls">
                        <button class="pad-play-btn">▶ Play</button>
                        <button class="pad-play-btn" style="font-size: 0.7em;">⏸ Pause</button>
                    </div>
                    <div class="pad-status">${statusText}</div>
                `;
                
                const playBtn = button.querySelectorAll('.pad-play-btn')[0];
                const pauseBtn = button.querySelectorAll('.pad-play-btn')[1];
                
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playSound(index);
                });
                
                pauseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.pauseSound(index);
                });
            }
            
            this.padGrid.appendChild(button);
        });
    }

    playSound(index) {
        if (!this.audioElements[index]) return;
        
        const audio = this.audioElements[index];
        const sound = this.sounds[index];
        
        audio.loop = sound.loop;
        audio.volume = sound.volume;
        audio.playbackRate = sound.playbackRate;
        
        if (sound.delay > 0) {
            setTimeout(() => {
                audio.currentTime = 0;
                audio.play().catch(err => console.log('Ошибка воспроизведения:', err));
                this.playingIndexes.add(index);
                this.updatePadStatus(index);
            }, sound.delay * 1000);
        } else {
            audio.currentTime = 0;
            audio.play().catch(err => console.log('Ошибка воспроизведения:', err));
            this.playingIndexes.add(index);
            this.updatePadStatus(index);
        }
        
        const buttons = document.querySelectorAll('.pad-button');
        buttons[index].classList.add('playing');
        
        setTimeout(() => {
            buttons[index].classList.remove('playing');
        }, 100);
    }

    pauseSound(index) {
        if (!this.audioElements[index]) return;
        
        const audio = this.audioElements[index];
        audio.pause();
        this.playingIndexes.delete(index);
        this.updatePadStatus(index);
    }

    updatePadStatus(index) {
        const buttons = document.querySelectorAll('.pad-button');
        if (buttons[index]) {
            const statusDiv = buttons[index].querySelector('.pad-status');
            if (statusDiv) {
                statusDiv.textContent = this.playingIndexes.has(index) ? '▶ Воспроизведение...' : '';
            }
        }
    }

    handleKeyPress(event) {
        if (this.editMode) return;
        
        const key = event.key.toLowerCase();
        let index = -1;
        
        for (let i = 0; i < this.sounds.length; i++) {
            if (this.sounds[i].hotkey.toLowerCase() === key) {
                index = i;
                break;
            }
        }
        
        if (index === -1) {
            index = this.keyMap.indexOf(key);
        }
        
        if (index !== -1 && index < this.sounds.length) {
            event.preventDefault();
            this.playSound(index);
        }
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        document.getElementById('editModeBtn').textContent = this.editMode ? '✓ Выход из редактирования' : '✏️ Режим редактирования';
        this.renderPad();
    }

    openEditModal(index) {
        this.editingIndex = index;
        const sound = this.sounds[index];
        
        document.getElementById('editName').value = sound.name;
        document.getElementById('editColor').value = sound.color;
        document.getElementById('editLoop').checked = sound.loop;
        document.getElementById('editVolume').value = sound.volume * 100;
        document.getElementById('editPlaybackRate').value = sound.playbackRate;
        document.getElementById('editDelay').value = sound.delay;
        document.getElementById('editHotkey').value = sound.hotkey;
        
        document.getElementById('volumeValue').textContent = Math.round(sound.volume * 100);
        document.getElementById('playbackValue').textContent = sound.playbackRate.toFixed(1) + 'x';
        
        this.updateHotkeySelect();
        
        const previewContainer = document.getElementById('previewContainer');
        const previewAudio = document.getElementById('previewAudio');
        const previewInfo = document.getElementById('previewInfo');
        
        previewAudio.src = sound.url;
        previewInfo.textContent = `Редактирование: ${sound.name}`;
        previewContainer.classList.add('show');
        
        this.modal.classList.add('show');
    }

    updateHotkeySelect() {
        const select = document.getElementById('editHotkey');
        select.innerHTML = '<option value="">Без клавиши</option>';
        
        const availableKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o'];
        const usedKeys = new Set(this.sounds.map(s => s.hotkey).filter(k => k));
        
        availableKeys.forEach(key => {
            if (!usedKeys.has(key) || this.sounds[this.editingIndex].hotkey === key) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = key.toUpperCase();
                select.appendChild(option);
            }
        });
    }

    saveEdit() {
        if (this.editingIndex === null) return;
        
        const sound = this.sounds[this.editingIndex];
        sound.name = document.getElementById('editName').value || 'Звук';
        sound.color = document.getElementById('editColor').value;
        sound.loop = document.getElementById('editLoop').checked;
        sound.volume = document.getElementById('editVolume').value / 100;
        sound.playbackRate = parseFloat(document.getElementById('editPlaybackRate').value);
        sound.hotkey = document.getElementById('editHotkey').value;
        sound.delay = parseFloat(document.getElementById('editDelay').value);
        
        this.closeModal();
        this.renderPad();
        this.saveToStorage();
    }

    deleteSound(index = null) {
        if (index === null) index = this.editingIndex;
        if (index === null) return;
        
        if (confirm('Вы уверены? Этот звук будет удалён.')) {
            if (this.audioElements[index]) {
                this.audioElements[index].pause();
            }
            this.sounds.splice(index, 1);
            this.closeModal();
            this.renderPad();
            this.saveToStorage();
        }
    }

    closeModal() {
        this.modal.classList.remove('show');
        document.getElementById('previewContainer').classList.remove('show');
        this.editingIndex = null;
    }

    stopAll() {
        this.audioElements.forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
        this.playingIndexes.clear();
        this.renderPad();
    }

    clearAll() {
        if (confirm('Вы уверены? Все звуки будут удалены.')) {
            this.stopAll();
            this.sounds = [];
            this.renderPad();
            this.fileInput.value = '';
            localStorage.removeItem('soundPadProject');
        }
    }

    saveProject() {
        const project = {
            version: 1,
            name: 'SoundPad Project',
            created: new Date().toISOString(),
            sounds: this.sounds.map(sound => ({
                id: sound.id,
                name: sound.name,
                color: sound.color,
                loop: sound.loop,
                volume: sound.volume,
                playbackRate: sound.playbackRate,
                hotkey: sound.hotkey,
                delay: sound.delay
            }))
        };
        
        const data = JSON.stringify(project);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soundpad-project-${Date.now()}.soundpad`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('Проект сохранён! (Параметры сохранены, файлы нужно загрузить отдельно)');
    }

    loadProject(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                
                if (project.version !== 1) {
                    alert('Неподдерживаемая версия проекта');
                    return;
                }
                
                this.sounds = this.sounds.map((sound, index) => {
                    const savedSound = project.sounds.find(s => s.name === sound.name);
                    if (savedSound) {
                        return { ...sound, ...savedSound };
                    }
                    return sound;
                });
                
                this.renderPad();
                this.saveToStorage();
                alert('Проект загружен!');
            } catch (error) {
                alert('Ошибка при загрузке проекта: ' + error.message);
            }
        };
        reader.readAsText(file);
        this.projectFile.value = '';
    }

    saveToStorage() {
        const data = {
            sounds: this.sounds.map(sound => ({
                id: sound.id,
                name: sound.name,
                url: sound.url,
                color: sound.color,
                loop: sound.loop,
                volume: sound.volume,
                playbackRate: sound.playbackRate,
                hotkey: sound.hotkey,
                delay: sound.delay
            }))
        };
        localStorage.setItem('soundPadProject', JSON.stringify(data));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('soundPadProject');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.sounds = data.sounds;
                this.renderPad();
            } catch (error) {
                console.log('Ошибка загрузки из памяти:', error);
            }
        }
    }

    adjustBrightness(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SoundPad();
});