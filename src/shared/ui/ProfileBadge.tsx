'use client';

import { useRef, type PointerEvent } from 'react';
import { Box } from 'lucide-react';
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';
import styles from './ProfileBadge.module.css';

export interface ProfileBadgeProps {
  name: string;
  email: string;
  role: string;
  memberId: string;
  memberSince: string;
  active: boolean;
}

const spring = { stiffness: 170, damping: 24, mass: 0.8 };

export function ProfileBadge({ name, email, role, memberId, memberSince, active }: ProfileBadgeProps) {
  const reducedMotion = useReducedMotion();
  const bounds = useRef<DOMRect | null>(null);
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const lightX = useTransform(rotateY, [-8, 8], [-110, 110]);
  const lightY = useTransform(rotateX, [-6, 6], [90, -90]);
  const lightOpacity = useSpring(0, spring);

  function reset() {
    bounds.current = null;
    rotateX.set(0);
    rotateY.set(0);
    lightOpacity.set(0);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion || (event.pointerType && event.pointerType !== 'mouse')) return;
    const rect = bounds.current || event.currentTarget.getBoundingClientRect();
    bounds.current = rect;
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    rotateX.set(-y * 6);
    rotateY.set(x * 8);
    lightOpacity.set(1);
  }

  return (
    <div
      className={styles.scene}
      data-testid="badge-scene"
      onPointerEnter={(event) => { bounds.current = event.currentTarget.getBoundingClientRect(); }}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <motion.div
        className={styles.rig}
        data-testid="badge-rig"
        style={{ rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY }}
      >
        <div className={styles.lanyard} aria-hidden="true">
          <div className={`${styles.strap} ${styles.strapLeft}`}><span>KUMO CRM · MAKERS ACCESS · KUMO CRM · MAKERS ACCESS</span></div>
          <div className={`${styles.strap} ${styles.strapRight}`}><span>KUMO CRM · MAKERS ACCESS · KUMO CRM · MAKERS ACCESS</span></div>
          <div className={styles.clip} />
          <div className={styles.loop} />
        </div>

        <article className={styles.holder} aria-label="Бейдж профиля">
          <div className={styles.slot} aria-hidden="true" />
          <div className={styles.insert}>
            <div className={styles.brandRow}>
              <span className={styles.brand}><Box size={17} strokeWidth={2.2} /> KUMO CRM</span>
              <span className={styles.serial}>NO {memberId}</span>
            </div>
            <p className={styles.eyebrow}>МАСТЕРСКАЯ · ЛИЧНЫЙ ПРОПУСК</p>
            <div className={styles.access} aria-hidden="true">LAB<br />ACCESS</div>
            <div className={styles.watermark} aria-hidden="true">3D</div>
            <div className={styles.identity}>
              <span className={styles.label}>ВЛАДЕЛЕЦ / HOLDER</span>
              <h1 className={styles.name}>{name || 'Участник'}</h1>
              <p className={styles.email}>{email || 'Почта не указана'}</p>
            </div>
            <div className={styles.membership}>
              <span className={styles.role}>{role}</span>
              <span className={styles.status}><span className={active ? styles.activeDot : styles.inactiveDot} />{active ? 'АКТИВЕН' : 'НЕАКТИВЕН'}</span>
            </div>
            <div className={styles.bottom}>
              <div className={styles.barcode} aria-hidden="true" />
              <div className={styles.bottomRow}><span>ID {memberId}</span><span>УЧАСТНИК С</span></div>
              <div className={styles.bottomRow}><span>CREATE · PRINT · REPEAT</span><span>{memberSince}</span></div>
            </div>
          </div>
          <div className={styles.glass} aria-hidden="true" />
          <motion.div
            className={styles.light}
            aria-hidden="true"
            style={{ x: reducedMotion ? 0 : lightX, y: reducedMotion ? 0 : lightY, opacity: reducedMotion ? 0 : lightOpacity }}
          />
          <div className={styles.rim} aria-hidden="true" />
        </article>
      </motion.div>
    </div>
  );
}
