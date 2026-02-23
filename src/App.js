import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// 1. 靜態設定檔：請根據你 public/assets 裡面的實際檔名來填寫
const staticConfig = {
  characters: ["hiro","sherry","ema","hanna"],             // 你的角色資料夾名稱
  sounds: ["gugugaga_hiro.mp3", "kiang_ema.mp3","kiang_hiro.mp3","艾瑪銀叫.mp3","希羅慘叫.mp3"], // 你的音效檔名 (強烈建議全部轉成 mp3 或 ogg)
  backgrounds: ["大廳.webp","牢房前走廊.webp","牢房.webp"
    ,"禁閉室前走廊.webp","餐廳.webp","醫務室.webp"
    ,"希羅起床.webp","牢希斷頭台.webp","牢瑪電梯.webp"
    ,"牢瑪斷頭台.webp","漢娜盪鞦韆.webp","橘遠聖經.webp"
    ,"希羅開機.webp","艾瑪開機.webp"
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 新的預載邏輯：只下載「當前畫面上」正在顯示的角色與背景
  useEffect(() => {
    // 1. 只預載目前選中的角色 (包含平常狀態和點擊狀態)
    if (state.char) {
      ['1.webp', '2.webp'].forEach(f => { 
        const img = new Image(); 
        img.src = `/assets/${state.char}/${f}`; 
      });
    }
    // 2. 只預載目前選中的背景
    if (state.bg) {
      const img = new Image(); 
      img.src = `/assets/background/${state.bg}`;
    }
    // 3. 音效通常檔案很小，只預載目前勾選的音效
    if (state.selectedSounds.length > 0) {
      state.selectedSounds.forEach(s => { 
        const a = new Audio(`/assets/sounds/${s}`); 
        a.preload = "auto"; 
      });
    }
  }, [state.char, state.bg, state.selectedSounds]); // 當玩家切換角色或背景時，才會觸發下載

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // 進入全螢幕 (針對整個網頁 document.documentElement)
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`全螢幕請求失敗: ${err.message}`);
      });
    } else {
      // 退出全螢幕
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

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
        {/* 改成單一的設定按鈕，並開啟 settings 視窗 */}
        <div className="move-toggle-box" onClick={() => setActiveModal('settings')}>
            <img src={`/assets/botton/botton1.webp`} alt="settings" />
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
              src={`/assets/${state.char}/${status.isPressed ? '2.webp' : '1.webp'}`} 
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
            <h3>
              {activeModal === 'char' ? '選擇角色' : 
               activeModal === 'bg' ? '選擇背景' : 
               activeModal === 'sound' ? '音訊過濾' : '設定'}
            </h3>
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
              
              {/* 設定選單的內容：全螢幕與移動開關 */}
              {activeModal === 'settings' && (
                <>
                  <button 
                    className={isFullscreen ? 'active' : ''} 
                    onClick={() => { toggleFullscreen(); setActiveModal(null); }}
                  >
                    {isFullscreen ? "退出全螢幕" : "全螢幕"}
                  </button>
                  <button 
                    className={canMove ? 'active' : ''} 
                    onClick={() => { setCanMove(!canMove); setActiveModal(null); }}
                  >
                    {canMove ? "鎖定角色" : "移動角色"}
                  </button>
                </>
              )}
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