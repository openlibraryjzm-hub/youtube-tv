import React, { useEffect, useRef, useState } from 'react';

// Constants
const CREATIVE_COLORS = ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#dbeafe', '#eff6ff'];

const CreativeMode = () => {
  const carouselTrackRef = useRef(null);
  const [showInitModal, setShowInitModal] = useState(false);

  const initCarousel = () => {
    if (!carouselTrackRef.current) return;

    const track = carouselTrackRef.current;
    track.innerHTML = '';

    const rects = CREATIVE_COLORS.map(color => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.innerHTML = `<div class="rectangle-placeholder" style="background-color: ${color}"></div>`;
      return slide;
    });

    // Clone for seamless loop
    [...rects, ...rects].forEach(slide => {
      track.appendChild(slide.cloneNode(true));
    });
  };

  useEffect(() => {
    initCarousel();

    // Hoist to window
    window.initCarousel = initCarousel;
    window.openInitModal = () => setShowInitModal(true);
    window.closeInitModal = () => setShowInitModal(false);
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-[#f0f7ff] to-white overflow-hidden">
      {/* Top Half: Massive Header with Integrated Play Button */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-0">
        <div
          className="massive-header font-black select-none"
          style={{
            fontSize: 'clamp(3rem, 15vw, 10rem)',
            lineHeight: 0.85,
            letterSpacing: '-0.05em',
            background: 'linear-gradient(to bottom, #3b82f6, #93c5fd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 10px 10px rgba(59, 130, 246, 0.1))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span>CREATIVE</span>
          <span>
            M
            <div
              id="playBtn"
              onClick={() => setShowInitModal(true)}
              className="play-o-button inline-flex items-center justify-center w-[0.85em] h-[0.85em] align-middle bg-[#f97316] rounded-full m-[0_0.05em] cursor-pointer transition-all duration-[0.4s] relative top-[-0.05em]"
              style={{
                boxShadow: '0 10px 25px rgba(249, 115, 22, 0.3)',
                animation: 'pulse-ring 3s infinite',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: '50%',
                  height: '50%',
                  fill: 'white',
                  marginLeft: '8%',
                }}
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            DE
          </span>
        </div>
      </section>

      {/* Bottom Half: Smooth Infinite Carousel */}
      <section className="carousel-container flex-1 min-h-0 w-full relative overflow-hidden bg-white/30 border-t border-blue-50 flex items-center">
        <div
          ref={carouselTrackRef}
          className="carousel-track flex gap-12 w-max p-8 h-full items-center"
          style={{
            animation: 'scrollRight 60s linear infinite',
          }}
        />
      </section>

      {/* Initialization Modal */}
      {showInitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-blue-100">
            <h2 className="text-3xl font-black text-blue-900 mb-4 tracking-tight">INITIALIZING</h2>
            <p className="text-blue-500/70 mb-8 font-medium">
              Preparing the creative canvas for your next masterpiece.
            </p>
            <button
              onClick={() => setShowInitModal(false)}
              className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 uppercase tracking-widest text-sm"
            >
              Enter
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4), 0 10px 25px rgba(249, 115, 22, 0.3);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(249, 115, 22, 0), 0 10px 25px rgba(249, 115, 22, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0), 0 10px 25px rgba(249, 115, 22, 0.3);
          }
        }
        .play-o-button:hover {
          transform: scale(1.1) rotate(5deg);
          background: #ea580c;
          box-shadow: 0 15px 35px rgba(249, 115, 22, 0.4);
          animation: none;
        }
        @keyframes scrollRight {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        .carousel-slide {
          height: 80%;
          aspect-ratio: 7 / 4;
          flex-shrink: 0;
        }
        .rectangle-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 2.5rem;
          box-shadow: 0 20px 40px rgba(59, 130, 246, 0.12);
          border: 6px solid white;
          transition: transform 0.3s ease;
        }
        .rectangle-placeholder:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default CreativeMode;
