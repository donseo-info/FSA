/**
 * AudioContext Fingerprinting Protection с seed-based minimal noise
 * Защита от audio fingerprinting через Web Audio API
 */
class AudioSpoof {
  constructor(options = {}) {
    this.seed = options.seed || Math.floor(Math.random() * 1000000);
    this.noiseAmplitude = options.noiseAmplitude || 0.00001; // Очень малый шум
  }

  /**
   * Генерирует JavaScript код для подмены AudioContext
   */
  getInjectionCode() {
    const seed = this.seed;
    const noiseAmplitude = this.noiseAmplitude;

    return `
      // ===== AUDIOCONTEXT FINGERPRINTING PROTECTION =====
      (function() {
        const INITIAL_SEED = ${seed};
        const NOISE_AMPLITUDE = ${noiseAmplitude};
        
        // Seed-based random generator (консистентный)
        let seedValue = INITIAL_SEED;
        const seededRandom = () => {
          seedValue = (seedValue * 9301 + 49297) % 233280;
          return seedValue / 233280;
        };
        
        // Добавляет консистентный шум к audio buffer
        const addNoiseToBuffer = (buffer) => {
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            
            for (let i = 0; i < data.length; i++) {
              // Добавляем очень малый шум
              const noise = (seededRandom() - 0.5) * 2 * NOISE_AMPLITUDE;
              data[i] = data[i] + noise;
            }
          }
          
          return buffer;
        };
        
        // ========================================
        // Патчим AudioBuffer.prototype.getChannelData
        // ========================================
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function(channel) {
          const originalData = originalGetChannelData.call(this, channel);
          
          // Создаем копию данных с шумом
          const noisyData = new Float32Array(originalData.length);
          
          // Сбрасываем seed для консистентности
          let localSeed = INITIAL_SEED + channel;
          const localRandom = () => {
            localSeed = (localSeed * 9301 + 49297) % 233280;
            return localSeed / 233280;
          };
          
          for (let i = 0; i < originalData.length; i++) {
            const noise = (localRandom() - 0.5) * 2 * NOISE_AMPLITUDE;
            noisyData[i] = originalData[i] + noise;
          }
          
          return noisyData;
        };
        
        // ========================================
        // Патчим AnalyserNode
        // ========================================
        
        // getFloatFrequencyData
        const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
        AnalyserNode.prototype.getFloatFrequencyData = function(array) {
          originalGetFloatFrequencyData.call(this, array);
          
          // Добавляем шум
          let localSeed = INITIAL_SEED;
          const localRandom = () => {
            localSeed = (localSeed * 9301 + 49297) % 233280;
            return localSeed / 233280;
          };
          
          for (let i = 0; i < array.length; i++) {
            const noise = (localRandom() - 0.5) * 2 * NOISE_AMPLITUDE * 10;
            array[i] = array[i] + noise;
          }
          
          return array;
        };
        
        // getByteFrequencyData
        const originalGetByteFrequencyData = AnalyserNode.prototype.getByteFrequencyData;
        AnalyserNode.prototype.getByteFrequencyData = function(array) {
          originalGetByteFrequencyData.call(this, array);
          
          // Добавляем шум
          let localSeed = INITIAL_SEED + 1000;
          const localRandom = () => {
            localSeed = (localSeed * 9301 + 49297) % 233280;
            return localSeed / 233280;
          };
          
          for (let i = 0; i < array.length; i++) {
            const noise = Math.floor((localRandom() - 0.5) * 2);
            array[i] = Math.max(0, Math.min(255, array[i] + noise));
          }
          
          return array;
        };
        
        // getFloatTimeDomainData
        const originalGetFloatTimeDomainData = AnalyserNode.prototype.getFloatTimeDomainData;
        AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
          originalGetFloatTimeDomainData.call(this, array);
          
          // Добавляем шум
          let localSeed = INITIAL_SEED + 2000;
          const localRandom = () => {
            localSeed = (localSeed * 9301 + 49297) % 233280;
            return localSeed / 233280;
          };
          
          for (let i = 0; i < array.length; i++) {
            const noise = (localRandom() - 0.5) * 2 * NOISE_AMPLITUDE;
            array[i] = array[i] + noise;
          }
          
          return array;
        };
        
        // getByteTimeDomainData
        const originalGetByteTimeDomainData = AnalyserNode.prototype.getByteTimeDomainData;
        AnalyserNode.prototype.getByteTimeDomainData = function(array) {
          originalGetByteTimeDomainData.call(this, array);
          
          // Добавляем шум
          let localSeed = INITIAL_SEED + 3000;
          const localRandom = () => {
            localSeed = (localSeed * 9301 + 49297) % 233280;
            return localSeed / 233280;
          };
          
          for (let i = 0; i < array.length; i++) {
            const noise = Math.floor((localRandom() - 0.5) * 2);
            array[i] = Math.max(0, Math.min(255, array[i] + noise));
          }
          
          return array;
        };
        
        // ========================================
        // Патчим DynamicsCompressorNode (используется для fingerprinting)
        // ========================================
        const originalCreateDynamicsCompressor = (
          AudioContext.prototype.createDynamicsCompressor ||
          OfflineAudioContext.prototype.createDynamicsCompressor
        );
        
        if (originalCreateDynamicsCompressor) {
          const patchCreateDynamicsCompressor = function() {
            const compressor = originalCreateDynamicsCompressor.call(this);
            
            // Слегка изменяем параметры (консистентно для профиля)
            const originalThreshold = compressor.threshold;
            const originalKnee = compressor.knee;
            const originalRatio = compressor.ratio;
            const originalAttack = compressor.attack;
            const originalRelease = compressor.release;
            
            // Добавляем микро-изменения на основе seed
            const localRandom = seededRandom();
            const thresholdNoise = (localRandom - 0.5) * 0.1;
            const kneeNoise = (seededRandom() - 0.5) * 0.1;
            
            try {
              compressor.threshold.value = originalThreshold.value + thresholdNoise;
              compressor.knee.value = originalKnee.value + kneeNoise;
            } catch (e) {
              // Игнорируем если параметры read-only
            }
            
            return compressor;
          };
          
          AudioContext.prototype.createDynamicsCompressor = patchCreateDynamicsCompressor;
          
          if (typeof OfflineAudioContext !== 'undefined') {
            OfflineAudioContext.prototype.createDynamicsCompressor = patchCreateDynamicsCompressor;
          }
        }
        
        // ========================================
        // Патчим OscillatorNode (используется для fingerprinting)
        // ========================================
        const originalCreateOscillator = AudioContext.prototype.createOscillator;
        
        if (originalCreateOscillator) {
          const patchCreateOscillator = function() {
            const oscillator = originalCreateOscillator.call(this);
            
            // Слегка изменяем частоту (консистентно)
            const originalFrequency = oscillator.frequency;
            const localRandom = seededRandom();
            const frequencyNoise = (localRandom - 0.5) * 0.001;
            
            try {
              oscillator.frequency.value = originalFrequency.value * (1 + frequencyNoise);
            } catch (e) {
              // Игнорируем
            }
            
            return oscillator;
          };
          
          AudioContext.prototype.createOscillator = patchCreateOscillator;
          
          if (typeof OfflineAudioContext !== 'undefined') {
            OfflineAudioContext.prototype.createOscillator = patchCreateOscillator;
          }
        }
        
        console.log('[AudioSpoof] ✅ Protection active (consistent mode)');
        console.log('[AudioSpoof] Seed:', INITIAL_SEED);
        console.log('[AudioSpoof] Noise amplitude:', NOISE_AMPLITUDE);
        
      })();
    `;
  }

  /**
   * Применяет подмену к странице
   */
  async apply(page) {
    await page.addInitScript(this.getInjectionCode());
    console.log(`🔊 Audio: Protected (seed: ${this.seed})`);
  }
}

export { AudioSpoof };