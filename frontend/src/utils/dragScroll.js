import { useEffect } from 'react';

/**
 * Custom hook to enable palm / mouse-drag horizontal scrolling
 * ONLY on elements that actually have horizontal overflow (scrollWidth > clientWidth).
 */
export function usePalmDragScroll() {
  useEffect(() => {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let activeTarget = null;
    let hasMoved = false;
    let lastX = 0;
    let velocity = 0;
    let momentumFrame = null;

    const getScrollContainer = (el) => {
      let current = el;
      while (current && current !== document.body && current !== document.documentElement) {
        if (current.scrollWidth > current.clientWidth + 2) {
          const style = window.getComputedStyle(current);
          const isOverflowX = style.overflowX === 'auto' || style.overflowX === 'scroll';
          const isTargetClass =
            current.classList.contains('ant-table-content') ||
            current.classList.contains('ant-table-body') ||
            current.classList.contains('ant-table-container') ||
            current.classList.contains('ant-tabs-nav-wrap') ||
            current.classList.contains('drag-scroll-x');

          if (isOverflowX || isTargetClass) {
            return current;
          }
        }
        current = current.parentElement;
      }
      return null;
    };

    const isExcludedTarget = (target) => {
      if (!target) return true;
      const tag = target.tagName || '';
      return (
        ['INPUT', 'SELECT', 'BUTTON', 'A', 'TEXTAREA', 'HEADER', 'NAV'].includes(tag) ||
        target.closest('header') ||
        target.closest('nav') ||
        target.closest('.ant-popover') ||
        target.closest('.ant-select') ||
        target.closest('.ant-btn') ||
        target.closest('.ant-dropdown') ||
        target.closest('.ant-pagination') ||
        target.closest('.ant-modal')
      );
    };

    const handleMouseDown = (e) => {
      if (isExcludedTarget(e.target)) {
        return;
      }


      const container = getScrollContainer(e.target);
      if (!container) return;

      if (momentumFrame) {
        cancelAnimationFrame(momentumFrame);
        momentumFrame = null;
      }

      isDown = true;
      hasMoved = false;
      activeTarget = container;
      startX = e.pageX - container.offsetLeft;
      lastX = e.pageX;
      velocity = 0;
      scrollLeft = container.scrollLeft;

      container.classList.add('palm-dragging-active');
      const card = container.closest('.ant-card');
      if (card) card.classList.add('palm-dragging-card-active');

      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
      if (!isDown || !activeTarget) return;
      const x = e.pageX - activeTarget.offsetLeft;
      const currentX = e.pageX;
      const deltaX = currentX - lastX;
      velocity = deltaX;
      lastX = currentX;

      const walk = (x - startX) * 1.4;
      if (Math.abs(x - startX) > 4) {
        hasMoved = true;
        activeTarget.scrollLeft = scrollLeft - walk;
      }
    };

    const handleMouseUp = () => {
      if (!isDown || !activeTarget) return;
      isDown = false;

      const targetEl = activeTarget;
      targetEl.classList.remove('palm-dragging-active');
      const card = targetEl.closest('.ant-card');
      if (card) card.classList.remove('palm-dragging-card-active');

      targetEl.style.cursor = 'grab';
      targetEl.style.removeProperty('user-select');

      // Physics momentum inertial glide on drag release
      if (hasMoved && Math.abs(velocity) > 1.5) {
        let currentVelocity = velocity * 1.2;
        const glide = () => {
          if (Math.abs(currentVelocity) > 0.5 && targetEl) {
            targetEl.scrollLeft -= currentVelocity;
            currentVelocity *= 0.92;
            momentumFrame = requestAnimationFrame(glide);
          } else {
            momentumFrame = null;
          }
        };
        momentumFrame = requestAnimationFrame(glide);
      }

      if (hasMoved) {
        const preventClick = (evt) => {
          evt.stopPropagation();
          evt.preventDefault();
        };
        window.addEventListener('click', preventClick, { capture: true, once: true });
      }
      activeTarget = null;
    };

    const handleMouseOver = (e) => {
      if (isDown) return;
      if (isExcludedTarget(e.target)) {
        return;
      }
      const container = getScrollContainer(e.target);

      if (container && container.style.cursor !== 'grab') {
        container.style.cursor = 'grab';
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (momentumFrame) cancelAnimationFrame(momentumFrame);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
}
