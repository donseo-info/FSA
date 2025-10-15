import fs from 'fs';
import path from 'path';

/**
 * Подмена WebRTC через Chrome Extension - УЛУЧШЕННАЯ ВЕРСИЯ
 * Поддержка любого IP, включая IP прокси
 */
class WebRTCSpoof {
  constructor(options = {}) {
    // Поддерживаем разные форматы
    if (typeof options === 'string') {
      // Старый формат: new WebRTCSpoof(ip, path)
      this.fakeIP = options;
      this.profilePath = arguments[1];
    } else {
      // Новый формат: new WebRTCSpoof({ ip, profilePath })
      this.fakeIP = options.ip || options.fakeIP || null;
      this.profilePath = options.profilePath || './profile';
    }
    
    this.extensionPath = path.join(this.profilePath, 'webrtc-protector');
  }

  /**
   * Устанавливает IP для подмены
   */
  setIP(ip) {
    this.fakeIP = ip;
    return this;
  }

  /**
   * Создает Chrome расширение для защиты WebRTC
   */
  createExtension() {
    if (!this.fakeIP) {
      console.warn('⚠️ WebRTC: Нет IP, расширение не создано');
      return null;
    }

    // Проверяем что IP валидный
    if (!this.isValidIP(this.fakeIP)) {
      console.warn('⚠️ WebRTC: Невалидный IP:', this.fakeIP);
      return null;
    }

    if (!fs.existsSync(this.extensionPath)) {
      fs.mkdirSync(this.extensionPath, { recursive: true });
    }

    // manifest.json
    const manifest = {
      manifest_version: 3,
      name: "WebRTC IP Protector",
      version: "2.0.0",
      description: "Protects real IP from WebRTC leaks",
      permissions: ["webRequest"],
      host_permissions: ["<all_urls>"],
      content_scripts: [{
        matches: ["<all_urls>"],
        js: ["content.js"],
        run_at: "document_start",
        all_frames: true,
        match_about_blank: true,
        world: "MAIN"
      }]
    };

    fs.writeFileSync(
      path.join(this.extensionPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // content.js - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
    const contentScript = this.getContentScript();
    
    fs.writeFileSync(
      path.join(this.extensionPath, 'content.js'),
      contentScript
    );

    console.log(`🔒 WebRTC Extension: ${this.fakeIP}`);
    
    return this.extensionPath;
  }

  /**
   * Проверяет что IP валидный
   */
  isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part);
      return num >= 0 && num <= 255;
    });
  }

  /**
   * Генерирует оптимизированный content.js
   */
  getContentScript() {
    return `
(function() {
  'use strict';
  
  const FAKE_IP = '${this.fakeIP}';
  
  console.log('[WebRTC Protector] Starting with IP:', FAKE_IP);
  
  // Быстрая замена IP в строке
  const replaceIP = (str) => {
    if (!str) return str;
    
    return str.replace(/(\\d{1,3}\\.){3}\\d{1,3}/g, (match) => {
      // Не трогаем специальные IP
      if (match.startsWith('127.') || 
          match.startsWith('0.') || 
          match.startsWith('224.') || 
          match.startsWith('255.') ||
          match === '0.0.0.0') {
        return match;
      }
      
      return FAKE_IP;
    });
  };
  
  // ========================================
  // Патчим RTCIceCandidate
  // ========================================
  const OrigRTCIceCandidate = window.RTCIceCandidate;
  
  if (OrigRTCIceCandidate) {
    window.RTCIceCandidate = function(candidateInitDict) {
      if (candidateInitDict && candidateInitDict.candidate) {
        candidateInitDict.candidate = replaceIP(candidateInitDict.candidate);
      }
      
      const iceCandidate = new OrigRTCIceCandidate(candidateInitDict);
      
      // Патчим getter
      const origGetter = Object.getOwnPropertyDescriptor(
        OrigRTCIceCandidate.prototype,
        'candidate'
      );
      
      if (origGetter && origGetter.get) {
        Object.defineProperty(iceCandidate, 'candidate', {
          get: function() {
            const candidate = origGetter.get.call(this);
            return replaceIP(candidate);
          },
          configurable: true
        });
      }
      
      return iceCandidate;
    };
    
    window.RTCIceCandidate.prototype = OrigRTCIceCandidate.prototype;
    Object.setPrototypeOf(window.RTCIceCandidate, OrigRTCIceCandidate);
  }
  
  // ========================================
  // Патчим RTCPeerConnection
  // ========================================
  const OrigRTC = window.RTCPeerConnection || 
                   window.webkitRTCPeerConnection || 
                   window.mozRTCPeerConnection;
  
  if (!OrigRTC) {
    console.warn('[WebRTC Protector] RTCPeerConnection not found');
    return;
  }
  
  const WrappedRTC = function(config, constraints) {
    const pc = new OrigRTC(config, constraints);
    
    // Патчим onicecandidate
    let iceHandler = null;
    Object.defineProperty(pc, 'onicecandidate', {
      get: () => iceHandler,
      set: (handler) => {
        iceHandler = function(event) {
          if (event && event.candidate && event.candidate.candidate) {
            const origCandidate = event.candidate.candidate;
            
            try {
              Object.defineProperty(event.candidate, 'candidate', {
                get: function() {
                  return replaceIP(origCandidate);
                },
                configurable: true
              });
            } catch (e) {
              // Игнорируем
            }
          }
          
          if (handler) handler(event);
        };
        
        pc.addEventListener('icecandidate', iceHandler);
      }
    });
    
    // Патчим addEventListener
    const origAddEvent = pc.addEventListener.bind(pc);
    pc.addEventListener = function(type, listener, ...args) {
      if (type === 'icecandidate') {
        const wrappedListener = function(event) {
          if (event && event.candidate && event.candidate.candidate) {
            const origCandidate = event.candidate.candidate;
            
            try {
              Object.defineProperty(event.candidate, 'candidate', {
                get: function() {
                  return replaceIP(origCandidate);
                },
                configurable: true
              });
            } catch (e) {
              // Игнорируем
            }
          }
          
          return listener(event);
        };
        
        return origAddEvent(type, wrappedListener, ...args);
      }
      
      return origAddEvent(type, listener, ...args);
    };
    
    // Патчим SDP методы
    const origCreateOffer = pc.createOffer.bind(pc);
    pc.createOffer = async (...args) => {
      const offer = await origCreateOffer(...args);
      if (offer && offer.sdp) {
        offer.sdp = replaceIP(offer.sdp);
      }
      return offer;
    };
    
    const origCreateAnswer = pc.createAnswer.bind(pc);
    pc.createAnswer = async (...args) => {
      const answer = await origCreateAnswer(...args);
      if (answer && answer.sdp) {
        answer.sdp = replaceIP(answer.sdp);
      }
      return answer;
    };
    
    const origSetLocal = pc.setLocalDescription.bind(pc);
    pc.setLocalDescription = async (desc, ...args) => {
      if (desc && desc.sdp) {
        desc.sdp = replaceIP(desc.sdp);
      }
      return origSetLocal(desc, ...args);
    };
    
    const origSetRemote = pc.setRemoteDescription.bind(pc);
    pc.setRemoteDescription = async (desc, ...args) => {
      if (desc && desc.sdp) {
        desc.sdp = replaceIP(desc.sdp);
      }
      return origSetRemote(desc, ...args);
    };
    
    // Патчим localDescription getter
    const origLocalGetter = Object.getOwnPropertyDescriptor(
      OrigRTC.prototype, 
      'localDescription'
    );
    
    if (origLocalGetter && origLocalGetter.get) {
      Object.defineProperty(pc, 'localDescription', {
        get: function() {
          const desc = origLocalGetter.get.call(this);
          if (desc && desc.sdp) {
            const modifiedDesc = Object.create(desc);
            modifiedDesc.sdp = replaceIP(desc.sdp);
            return modifiedDesc;
          }
          return desc;
        }
      });
    }
    
    return pc;
  };
  
  WrappedRTC.prototype = OrigRTC.prototype;
  Object.setPrototypeOf(WrappedRTC, OrigRTC);
  
  Object.defineProperty(window, 'RTCPeerConnection', {
    get: () => WrappedRTC,
    set: () => {},
    configurable: false
  });
  
  window.webkitRTCPeerConnection = WrappedRTC;
  window.mozRTCPeerConnection = WrappedRTC;
  
  console.log('[WebRTC Protector] Active');
  
})();
    `;
  }

  /**
   * Возвращает путь к расширению
   */
  getExtensionPath() {
    return this.extensionPath;
  }
}

export { WebRTCSpoof };