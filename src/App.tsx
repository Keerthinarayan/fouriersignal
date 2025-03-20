import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';

interface FourierTerm {
  amplitude: number;
  frequency: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [terms, setTerms] = useState<FourierTerm[]>([
    { amplitude: 1, frequency: 1 },
    { amplitude: 0, frequency: 2 },
    { amplitude: 0, frequency: 3 },
  ]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [targetWave, setTargetWave] = useState('square');
  const [isCustomWaveModalOpen, setIsCustomWaveModalOpen] = useState(false);
  const [customWaveTerms, setCustomWaveTerms] = useState<FourierTerm[]>([
    { amplitude: 1, frequency: 1 },
    { amplitude: 0, frequency: 2 },
    { amplitude: 0, frequency: 3 },
  ]);

  const drawWave = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    const centerY = height / 2;

    // Draw target wave
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    for (let x = 0; x < width; x++) {
      const t = (x / width) * Math.PI * 2;
      let y = 0;

      switch (targetWave) {
        case 'square':
          y = Math.sign(Math.sin(t)) * 50;
          break;
        case 'sawtooth':
          y = ((t % (Math.PI * 2)) / Math.PI - 1) * 25;
          break;
        case 'triangle':
          y = (Math.abs((t % (Math.PI * 2)) - Math.PI) / Math.PI - 0.5) * 100;
          break;
        case 'pulse':
          y = Math.sin(t) > 0.7 ? 50 : -50;
          break;
        case 'custom':
          y = customWaveTerms.reduce((sum, term) => {
            return sum + term.amplitude * Math.sin(term.frequency * t) * 50;
          }, 0);
          break;
      }

      if (x === 0) ctx.moveTo(x, centerY + y);
      else ctx.lineTo(x, centerY + y);
    }
    ctx.stroke();

    // Draw approximation
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    for (let x = 0; x < width; x++) {
      const t = (x / width) * Math.PI * 2 + time;
      const y = terms.reduce((sum, term) => {
        return sum + term.amplitude * Math.sin(term.frequency * t) * 50;
      }, 0);
      if (x === 0) ctx.moveTo(x, centerY + y);
      else ctx.lineTo(x, centerY + y);
    }
    ctx.stroke();

    // Draw axis line
    ctx.beginPath();
    ctx.strokeStyle = '#4b5563';
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (isPlaying) {
        setTime((t) => t + 0.02);
      }
    };

    const interval = setInterval(animate, 16);
    drawWave(ctx, canvas.width, canvas.height);

    return () => clearInterval(interval);
  }, [time, terms, isPlaying, targetWave, customWaveTerms]);

  const updateTerm = (index: number, field: keyof FourierTerm, value: number) => {
    const newTerms = [...terms];
    newTerms[index] = { ...newTerms[index], [field]: value };
    setTerms(newTerms);

    // Calculate score using Root Mean Square Error (RMSE)
    const samplePoints = 100; // Number of points to sample for score calculation
    let totalSquaredError = 0;

    // Get target wave characteristics
    const targetWaveFn = (t: number) => {
      switch (targetWave) {
        case 'square':
          return Math.sign(Math.sin(t)) * 50;
        case 'sawtooth':
          return ((t % (Math.PI * 2)) / Math.PI - 1) * 25;
        case 'triangle':
          return (Math.abs((t % (Math.PI * 2)) - Math.PI) / Math.PI - 0.5) * 100;
        case 'pulse':
          return Math.sin(t) > 0.7 ? 50 : -50;
        case 'custom':
          return customWaveTerms.reduce((sum, term) => 
            sum + term.amplitude * Math.sin(term.frequency * t) * 50, 0);
        default:
          return 0;
      }
    };

    // Calculate maximum possible error
    const targetMax = targetWave === 'custom' 
      ? customWaveTerms.reduce((sum, term) => sum + Math.abs(term.amplitude) * 50, 0)
      : 50; // Default max amplitude for other waves
    const approximationMax = newTerms.reduce((sum, term) => sum + Math.abs(term.amplitude) * 50, 0);
    const maxPossibleError = Math.sqrt(Math.pow(targetMax + approximationMax, 2));

    for (let i = 0; i < samplePoints; i++) {
      const t = (i / samplePoints) * Math.PI * 2;

      // Calculate target and approximation values
      const targetY = targetWaveFn(t);
      const approximationY = newTerms.reduce((sum, term) => 
        sum + term.amplitude * Math.sin(term.frequency * t) * 50, 0);

      // Accumulate squared error
      totalSquaredError += Math.pow(targetY - approximationY, 2);
    }

    // Calculate RMSE and normalize score
    const rmse = Math.sqrt(totalSquaredError / samplePoints);
    const normalizedScore = 100 * (1 - rmse / maxPossibleError);
    setScore(Math.round(Math.max(0, normalizedScore)));
  };

  const handleSaveCustomWave = () => {
    setTargetWave('custom');
    setIsCustomWaveModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Fourier Series Game</h1>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <canvas
            ref={canvasRef}
            width={window.innerWidth > 768 ? 800 : window.innerWidth - 32}
            height={200}
            className="w-full bg-gray-700 rounded-lg mb-4"
          />

          <div className="flex gap-4 justify-center mb-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => setTime(0)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={20} />
              Reset
            </button>
          </div>

          <div className="space-y-4">
            {terms.map((term, i) => (
              <div key={i} className="flex flex-col gap-2 bg-gray-700/50 p-4 rounded-lg">
                <span className="font-medium">Term {i + 1}</span>
                <div>
                  <label className="block text-sm mb-1 text-gray-300">Amplitude</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={term.amplitude}
                      onChange={(e) => updateTerm(i, 'amplitude', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-right font-mono">{term.amplitude.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-300">Frequency</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={term.frequency}
                      onChange={(e) => updateTerm(i, 'frequency', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-right font-mono">{term.frequency}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Score</h2>
            <div className="text-3xl font-bold text-blue-400">{score}</div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Target Wave</h3>
              <select
                value={targetWave}
                onChange={(e) => {
                  setTargetWave(e.target.value);
                  if (e.target.value === 'custom') {
                    setIsCustomWaveModalOpen(true);
                  }
                }}
                className="w-full bg-gray-700 px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
              >
                <option value="square">Square Wave</option>
                <option value="sawtooth">Sawtooth Wave</option>
                <option value="triangle">Triangle Wave</option>
                <option value="pulse">Pulse Wave</option>
                <option value="custom">Custom Wave</option>
              </select>
            </div>

            <button
              onClick={() => setTerms([...terms, { amplitude: 0, frequency: terms.length + 1 }])}
              className="w-full px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Term
            </button>
          </div>
        </div>
      </div>

      {/* Custom Wave Modal */}
      {isCustomWaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Set Custom Wave</h2>
            <div className="space-y-4">
              {customWaveTerms.map((term, i) => (
                <div key={i} className="flex flex-col gap-2 bg-gray-700/50 p-4 rounded-lg">
                  <span className="font-medium">Term {i + 1}</span>
                  <div>
                    <label className="block text-sm mb-1 text-gray-300">Amplitude</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.1"
                        value={term.amplitude}
                        onChange={(e) => {
                          const newTerms = [...customWaveTerms];
                          newTerms[i].amplitude = parseFloat(e.target.value);
                          setCustomWaveTerms(newTerms);
                        }}
                        className="flex-1"
                      />
                      <span className="w-12 text-right font-mono">{term.amplitude.toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-300">Frequency</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={term.frequency}
                        onChange={(e) => {
                          const newTerms = [...customWaveTerms];
                          newTerms[i].frequency = parseInt(e.target.value);
                          setCustomWaveTerms(newTerms);
                        }}
                        className="flex-1"
                      />
                      <span className="w-12 text-right font-mono">{term.frequency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setIsCustomWaveModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomWave}
                className="flex-1 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copyright Notice */}
      <footer className="text-center mt-8 text-gray-400">
        &copy; {new Date().getFullYear()} Keerthi Narayan
      </footer>
    </div>
  );
}

export default App;