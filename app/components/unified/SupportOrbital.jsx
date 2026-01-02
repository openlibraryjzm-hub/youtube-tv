import React, { useEffect, useRef } from 'react';

// Constants
const SUPPORT_ICONS = {
  "Discord": "M4 4h10c3 0 5 2 5 5v6c0 3-2 5-5 5H4V4zm4 4v8h2c1 0 2-1 2-2V10c0-1-1-2-2-2H8z",
  "Project Code": "M8 7l5 5-5 5 M14 17h5",
  "Bug Report": "M12 2a4 4 0 014 4v2h2a2 2 0 012 2v2a2 2 0 01-2 2h-1v2a5 5 0 01-10 0v-2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2V6a4 4 0 014-4zM9 10h6M9 14h6",
  "X": "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z",
  "CatX": "M12 7c2.76 0 5 2.24 5 5v1c0 2.76-2.24 5-5 5s-5-2.24-5-5v-1c0-2.76 2.24-5 5-5zm-5 1L5 4M17 8l2-4 M9 12h.01 M15 12h.01 M11 15h2"
};

const ICON_TITLES = ["Discord", "Project Code", "Bug Report", "X", "CatX"];

// Mathematical geometry functions (preserved as per context.md)
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const describeDonutSegment = (x, y, innerRadius, outerRadius, startAngle, endAngle) => {
  const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const startInner = polarToCartesian(x, y, innerRadius, startAngle);
  const endInner = polarToCartesian(x, y, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", startOuter.x, startOuter.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
    "L", endInner.x, endInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 0, startInner.x, startInner.y,
    "Z"
  ].join(" ");
};

const SupportOrbital = ({ onGoHome }) => {
  const svgRef = useRef(null);

  const createSupportRing = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const outerR = 45;
    const innerR = 25;
    const center = 50;
    const step = 360 / 5;
    const startOffset = -90;

    ICON_TITLES.forEach((title, i) => {
      const startAngle = startOffset + (i * step);
      const endAngle = startOffset + ((i + 1) * step);
      const midAngle = (startAngle + endAngle) / 2;

      const segmentPath = describeDonutSegment(center, center, innerR, outerR, startAngle, endAngle);

      // Create anchor element
      const a = document.createElementNS("http://www.w3.org/2000/svg", "a");
      a.setAttribute("href", "#");
      a.classList.add("nav-link");
      a.addEventListener('click', (e) => {
        e.preventDefault();
        // Handle navigation if needed
      });

      // Create path for segment
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", segmentPath);
      path.classList.add("segment");

      // Calculate icon position (normal orientation - not rotated)
      const textR = (innerR + outerR) / 2;
      const pos = polarToCartesian(center, center, textR, midAngle);

      // Create icon group
      const posGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const scale = 0.5;
      const tx = pos.x - (12 * scale);
      const ty = pos.y - (12 * scale);
      posGroup.setAttribute("transform", `translate(${tx}, ${ty}) scale(${scale})`);

      const animGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      animGroup.classList.add("support-icon-container");

      const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      iconPath.setAttribute("d", SUPPORT_ICONS[title]);

      // Special handling for Project Code (stroke instead of fill)
      if (title === "Project Code") {
        iconPath.setAttribute("fill", "none");
        iconPath.setAttribute("stroke", "currentColor");
        iconPath.setAttribute("stroke-width", "2.5");
        iconPath.setAttribute("stroke-linecap", "round");
        iconPath.setAttribute("stroke-linejoin", "round");
      } else {
        iconPath.setAttribute("fill", "currentColor");
      }

      animGroup.appendChild(iconPath);
      posGroup.appendChild(animGroup);
      a.appendChild(path);
      a.appendChild(posGroup);
      svg.appendChild(a);
    });
  };

  useEffect(() => {
    createSupportRing();

    // Hoist functions to window
    window.polarToCartesian = polarToCartesian;
    window.describeDonutSegment = describeDonutSegment;
    window.createSupportRing = createSupportRing;
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0f9ff] relative">
      {/* Background blob */}
      <div className="fixed w-screen h-screen bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#e0f2fe_100%)] z-[-1]" />

      <div className="relative w-[450px] h-[450px] flex justify-center items-center">
        {/* Central Pulsing Heart */}
        <div
          className="absolute z-10 pointer-events-auto cursor-pointer"
          onClick={onGoHome}
        >
          <svg
            className="pulse w-24 h-24 md:w-32 md:h-32 text-red-400 fill-current"
            viewBox="0 0 24 24"
            style={{
              animation: 'pulse-animation 2s infinite ease-in-out',
              filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.2))'
            }}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>

        {/* Segmented Ring */}
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="navigation-ring w-full h-full"
        />
      </div>

      <div className="mt-8 text-center text-sky-700">
        <h2 className="text-2xl font-bold tracking-tight">Support Hub</h2>
        <p className="text-sm opacity-60 mt-2">Orbital Navigation System</p>
      </div>

      <style>{`
        @keyframes pulse-animation {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .segment {
          fill: #ffffff;
          stroke: #bae6fd;
          stroke-width: 0.5;
          transition: fill 0.3s ease;
          cursor: pointer;
        }
        .segment:hover {
          fill: #e0f2fe;
        }
        .support-icon-container {
          transform-box: fill-box;
          transform-origin: center;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), fill 0.3s ease;
          fill: #0369a1;
          pointer-events: none;
        }
        .nav-link:hover .support-icon-container {
          transform: scale(1.2);
          fill: #0c4a6e;
        }
        .nav-link {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default SupportOrbital;
