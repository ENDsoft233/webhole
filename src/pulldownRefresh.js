import * as React from 'react';

import './pulldownRefresh.css';

export default function PulldownRefresh(props) {
  const { enable, handleRefresh } = props;
  const enableRef = React.useRef(enable);
  const [loading, setLoading] = React.useState(false);
  const loadingRef = React.useRef(false);
  const [startY, setStartY] = React.useState(0);
  const startYRef = React.useRef(0);
  const [endY, setEndY] = React.useState(0);
  const endYRef = React.useRef(0);
  const [isPulling, setIsPulling] = React.useState(false);
  const isPullingRef = React.useRef(false);
  const [animation, setAnimation] = React.useState(false);
  const animationRef = React.useRef(false);
  const validStart = React.useRef(false);
  const handleTouchStart = (e) => {
    if (window.scrollY === 0 && enableRef.current) {
      startYRef.current = e.touches[0].clientY;
      setStartY(startYRef.current);
      validStart.current = true;
    }
  };
  const handleTouchMove = (e) => {
    if (!validStart.current) return;
    endYRef.current = e.touches[0].clientY;
    setEndY(endYRef.current);
    if (endYRef.current - startYRef.current > 0) {
      isPullingRef.current = true;
      setIsPulling(true);
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const handleTouchEnd = () => {
    validStart.current = false;
    if (isPullingRef.current && endYRef.current - startYRef.current > 60) {
      loadingRef.current = true;
      setLoading(true);
      animationRef.current = true;
      setAnimation(true);
      handleRefresh().then(() => {
        isPullingRef.current = false;
        setIsPulling(false);
        loadingRef.current = false;
        setLoading(false);
        setTimeout(() => {
          animationRef.current = false;
          setAnimation(false);
        }, 500);
      });
    } else if (isPullingRef.current) {
      animationRef.current = true;
      setAnimation(true);
      isPullingRef.current = false;
      setIsPulling(false);
      setTimeout(() => {
        animationRef.current = false;
        setAnimation(false);
      }, 500);
    }
  };
  const ref = React.useRef(null);
  React.useEffect(() => {
    const { current } = ref;
    enableRef.current = props.enable;
    current.addEventListener('touchstart', handleTouchStart, {
      passive: false,
      capture: true,
    });
    current.addEventListener('touchmove', handleTouchMove, {
      passive: false,
      capture: true,
    });
    current.addEventListener('touchend', handleTouchEnd, {
      passive: false,
      capture: true,
    });
  }, [props.enable]);
  return (
    <div ref={ref}>
      {props.children}
      <div
        style={{
          width: '100%',
          display: 'flex',
          position: 'fixed',
          left: 0,
          flexDirection: 'column',
          alignItems: 'center',
          transition: !animation ? '0s' : '0.2s',
          top: !isPulling
            ? '-80px'
            : loading
            ? '72px'
            : `${endY - startY - 40}px`,
          zIndex: 999,
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: !loading
              ? 'rgb(164, 185, 217)'
              : 'rgba(255,255,255,.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '36px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
          aria-label="refresh"
        >
          <span
            className="icon icon-refresh"
            style={{
              animation: loading ? 'rotate 0.5s linear infinite' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
