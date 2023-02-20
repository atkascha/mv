// jsmediatags
var jsmediatags = window.jsmediatags

// MusicVisualizer
class MV {
  constructor() {
    // html
    this.container = document.querySelector('#container')
    this.duration = document.querySelector('#duration')
    this.state = document.querySelector('#state')
    this.songState = document.querySelector('#song-state')
    this.input = document.querySelector('#input')

    // variables
    this.cover = null
    this.songIndex = 0
    this.songCount = 0
    this.songCover = null
    this.songs = {}

    // audio
    this.audio = new Audio()
    this.audio.volume = 0.1

    // init
    this.#addListeners()
  }

  get currentSong() {
    return this.songs[this.songIndex].file
  }

  get currentDuration() {
    if (this.audio?.duration) {
      return this.audio.duration
    }

    return 0
  }

  // known bug: because of jsmediatags, we may not have access to attributes immediately
  // working on a fix/workaround
  get #currentSongName() {
    let title = this.songs[this.songIndex]?.tags?.title ?
      this.songs[this.songIndex]?.tags?.title :
      '...'
    let artist = this.songs[this.songIndex]?.tags?.artist ?
      this.songs[this.songIndex]?.tags?.artist :
      '...'

    return `"${title}" - ${artist}`
  }

  get currentBackground() {
    let picture = this.songs[this.songIndex]?.tags?.picture
    if (!picture) {
      return './cd.gif'
    }

    let base64String = ''
    for (let i = 0; i < picture.data.length; i++) {
      base64String += String.fromCharCode(picture.data[i])
    }

    return `data:${picture.format};base64,${window.btoa(base64String)}`
  }

  get #volumeToString() {
    return this.audio.volume.toFixed(2)
  }

  #addListeners() {
    this.#addInputListener()
    this.#addContainerListener()
    this.#addAudioListener()
  }

  // make MVFile
  // make MVFileBuilder
  // refactor me
  #addInputListener() {
    this.input.addEventListener('change', (event) => {
      this.songState.innerText = 'uploading...'

      let mp3s = []
      for (let i = 0; i < event.target.files.length; i++) {
        if (event.target.files[i].type === 'audio/mpeg') {
          mp3s.push(event.target.files[i])
        }
      }

      this.songCount = mp3s.length

      for (let i = 0; i < mp3s.length; i++) {
        let file = mp3s[i]
        this.songs[i] = {
          file: file,
          rawName: file.name
        }

        jsmediatags.read(file, {
          onSuccess: function(data) {
            let i = 0
            while (i < mp3s.length) {
              let mp3 = mp3s[i]
              if (mp3.name.includes(data.tags.title)) {
                this.songs[i].tags = data.tags
              }
              i++
            }
          }.bind(this),
          onError: function(error) {
            console.log(error)
          }
        })
      }

      this.#playSong()
      this.input.style.display = 'none'
      this.songState.innerText = ''
    })
  }

  #addContainerListener() {
    document.addEventListener('keyup', (event) => {
      if (event.key === 'ArrowRight') {
        this.#updateSongState('next song')
        this.#gotoNextSong()
      } else if (event.key === 'ArrowLeft') {
        this.#updateSongState('last song')
        this.#gotoLastSong()
      } else if (event.key === ' ') {
        this.#togglePlayPause()
      } else if (event.key === 'ArrowDown') {
        this.audio.volume -= 0.01
        this.#updateSongState(`volume down (${this.#volumeToString})`)
      } else if (event.key === 'ArrowUp') {
        this.audio.volume += 0.01
        this.#updateSongState(`volume up (${this.#volumeToString})`)
      } else if (event.key === 'm') {
        this.audio.volume = 0
        this.#updateSongState('muted')
      }
    })
  }

  #addAudioListener() {
    this.audio.addEventListener('ended', function() {
      this.#gotoNextSong()
    }.bind(this))
  }

  #gotoNextSong() {
    this.songIndex++
    if (this.songIndex >= this.songCount) {
      this.songIndex = 0
    }

    this.#playSong()
  }

  #gotoLastSong() {
    this.songIndex--
    if (this.songIndex <= 0) {
      this.songIndex = this.songCount - 1
    }

    this.#playSong()
  }

  #togglePlayPause() {
    if (!this.audio.paused) {
      this.#updateSongState('paused')
      this.audio.pause()
    } else {
      this.audio.play()
    }
  }

  // this approach is needed because we cannot set backgroundImage from base64
  #updateCover() {
    let img = new Image()
    let bg = this.currentBackground
    img.src = bg
    this.container.style.backgroundImage = `url(${img.src})`

    if (bg === './cd.gif') {
      setTimeout(function() {
        this.#updateCover()
        this.#updateSong(this.#currentSongName)
      }.bind(this), 1000)
    }
  }

  #showDurationBar() {
    this.duration.style.display = 'block'
  }

  #updateDuration() {
    this.durationInterval = setInterval(function() {
      let width = (this.audio.currentTime / this.audio.duration) * 100
      this.duration.style.width = `${width}vw`

      if (width >= 99) {
        this.duration.style.display = 'none'
        this.duration.style.width = '0vw'
        clearInterval(this.durationInterval)
      }
    }.bind(this), 50)
  }

  #playSong() {
    let reader = new FileReader()
    reader.addEventListener('load', (event) => {
      this.audio.src = event.target.result
      this.audio.play()
    })
    reader.readAsDataURL(this.currentSong)

    this.#updateCover()
    this.#showDurationBar()
    this.#updateDuration()
    this.#updateSong(this.#currentSongName)
  }

  #updateSong(newState) {
    this.state.innerText = newState
  }

  #updateSongState(newState) {
    this.songState.innerText = newState
    this.songState.style.opacity = 1.0

    ///
    this.currentfadeOutInterval = setInterval(function() {
      let opacity = parseFloat(this.songState.style.opacity)
      opacity -= 0.1
      this.songState.style.opacity = opacity

      if (opacity <= 0) {
        clearInterval(this.currentfadeOutInterval)
      }
    }.bind(this), 200)
  }
}

// ...
new MV()
