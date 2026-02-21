import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// 1. 靜態設定檔：請根據你 public/assets 裡面的實際檔名來填寫
const staticConfig = {
  characters: ["hiro","sherry","ema","hanna"],             // 你的角色資料夾名稱
  sounds: ["gugugaga_hiro.wav", "kiang_ema.mp3","kiang_hiro.wav","艾瑪銀叫.ogg","希羅慘叫.ogg"], // 你的音效檔名 (強烈建議全部轉成 mp3 或 ogg)
  backgrounds: ["background1.jpg","background2.jpg","background3.jpg"
    ,"background4.jpg","background5.jpg","background6.jpg"
    ,"希羅起床.jpg","牢希斷頭台.jpg","牢瑪電梯.jpg"
    ,"牢瑪斷頭台.jpg","漢娜盪鞦韆.jpg","橘遠聖經.jpg"
  ]         // 你的背景檔名
};

function App() {
  // 2. 直接使用 staticConfig 作為初始狀態，完全不依賴後端
  const [config, setConfig] = useState(staticConfig);
  const [state, setState] = useState({
    char: staticConfig.characters[0] || "", 
    bg: staticConfig.backgrounds[0] || "", 
    selectedSounds: staticConfig.sounds,
    count: parseInt(localStorage.getItem("clickCount") || "0")
  });
  
  const [status, setStatus] = useState({ isPressed: false, isRed: false, isRainbow: false });
  const [showPanel, setShowPanel] = useState(true); 
  const [activeModal, setActiveModal] = useState(null); 
  const [canMove, setCanMove] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false); 

  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const redTimerRef = useRef(null);
  const rainbowTimerRef = useRef(null);

  // 3. 預載資源 (保持原樣，但資源路徑改為純前端讀取)
  useEffect(() => {
    if (config.characters.length > 0) {
      config.characters.forEach(char => {
        ['1.png', '2.png'].forEach(f => { const img = new Image(); img.src = `/assets/${char}/${f}`; });
      });
      config.backgrounds.forEach(bg => { const img = new Image(); img.src = `/assets/background/${bg}`; });
      config.sounds.forEach(s => { const a = new Audio(`/assets/sounds/${s}`); a.preload = "auto"; });
    }
  }, [config]);

  const handleAction = (e) => {
    if (canMove || isProcessing) return; 
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    setIsProcessing(true);
    
    // 隨機觸發彩虹效果
    const rainbowTrigger = Math.random() < 0.001;
    
    if (rainbowTrigger) {
      if (rainbowTimerRef.current) clearTimeout(rainbowTimerRef.current);
      setStatus(prev => ({ ...prev, isPressed: true, isRainbow: true, isRed: false }));
      
      rainbowTimerRef.current = setTimeout(() => {
        setStatus(prev => ({ ...prev, isRainbow: false }));
      }, 5000); 
    } else {
      setStatus(prev => ({ ...prev, isPressed: true }));
    }

    // 播放音訊 (加入防崩潰處理)
    if (state.selectedSounds.length > 0) {
      const sound = state.selectedSounds[Math.floor(Math.random() * state.selectedSounds.length)];
      if (sound) {
        const audio = new Audio(`/assets/sounds/${sound}`);
        // 使用 .catch() 默默吃掉連點造成的播放中斷錯誤
        audio.play().catch(error => {
          console.log("太快了，稍微忽略一個音效~");
        });
      }
    }

    const newCount = state.count + 1;
    setState(s => ({ ...s, count: newCount }));
    localStorage.setItem("clickCount", newCount);

    // 4. 修正：將長按觸發紅色特效的計時器設定為 800ms
    redTimerRef.current = setTimeout(() => {
      setStatus(prev => {
        if (prev.isRainbow) return prev;
        return { ...prev, isRed: true };
      });
    }, 2500); 
    
    setTimeout(() => setIsProcessing(false), 50); 
  };

  const handleRelease = () => {
    clearTimeout(redTimerRef.current);
    setStatus(prev => ({ ...prev, isPressed: false, isRed: false }));
  };

  const handleDragStart = (e) => {
    if (!canMove) return;
    isDragging.current = true;
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    offset.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleDragging = (e) => {
    if (!isDragging.current || !canMove) return;
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    setPosition({ x: clientX - offset.current.x, y: clientY - offset.current.y });
  };

  const handleDragEnd = () => { isDragging.current = false; };

  return (
    <div className="App" 
         style={{ backgroundImage: state.bg ? `url(/assets/background/${state.bg})` : 'none' }}
         onPointerMove={handleDragging} onPointerUp={handleDragEnd}>
      
      <div className="top-ui-container">
        <div className="score-area">
            <span className="char-name">{state.char.toUpperCase()}</span> 
            一共叫了 <span className="score-num">{state.count}</span> 次
        </div>
        <div className={`move-toggle-box ${canMove ? 'active' : ''}`} onClick={() => setCanMove(!canMove)}>
            <img src={`/assets/botton/move-btn.png`} alt="move" />
        </div>
      </div>

      <button className="toggle-panel-btn" onClick={() => setShowPanel(!showPanel)}> 
        {showPanel ? "CLOSE" : "MENU"} 
      </button>

      <div className="main-display">
        {state.char && (
          <div
            className="char-position-wrapper"
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => { handleDragStart(e); handleAction(e); }}
            onPointerUp={handleRelease}
            onPointerLeave={handleRelease}
            onPointerCancel={handleRelease} 
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              position: 'relative',
              zIndex: 10,
              touchAction: 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <img 
              src={`/assets/${state.char}/${status.isPressed ? '2.png' : '1.png'}`} 
              className={`pop-img ${status.isRed ? 'effect-red' : ''} ${status.isRainbow ? 'effect-rainbow' : ''} ${canMove ? 'draggable' : ''}`}
              alt="char" 
              draggable="false" 
              style={{ 
                  transform: status.isPressed ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.1s' 
              }}
            />
          </div>
        )}
      </div>

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{activeModal === 'char' ? '選擇角色' : activeModal === 'bg' ? '選擇背景' : '音訊過濾'}</h3>
            <div className="modal-scroll-area">
              {activeModal === 'char' && config.characters.map(c => (
                <button key={c} className={state.char === c ? 'active' : ''} onClick={() => { setState({...state, char: c}); setActiveModal(null); }}>{c}</button>
              ))}
              {activeModal === 'bg' && config.backgrounds.map(b => (
                <button key={b} className={state.bg === b ? 'active' : ''} onClick={() => { setState({...state, bg: b}); setActiveModal(null); }}>{b.split('.')[0]}</button>
              ))}
              {activeModal === 'sound' && config.sounds.map(s => (
                <button key={s} className={state.selectedSounds.includes(s) ? 'active' : ''} 
                  onClick={() => {
                    const next = state.selectedSounds.includes(s) ? state.selectedSounds.filter(i => i !== s) : [...state.selectedSounds, s];
                    setState({...state, selectedSounds: next});
                  }}>{s.replace(/\.[^/.]+$/, "")}</button>
              ))}
            </div>
            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>關閉</button>
          </div>
        </div>
      )}

      <footer className={`control-panel ${showPanel ? 'show' : 'hide'}`}>
        <div className="bottom-btn-row">
          <button onClick={() => setActiveModal('char')}>角色切換</button>
          <button onClick={() => setActiveModal('bg')}>背景選擇</button>
          <button onClick={() => setActiveModal('sound')}>音訊過濾</button>
        </div>
      </footer>
    </div>
  );
}

export default App;