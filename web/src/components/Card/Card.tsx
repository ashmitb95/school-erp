import React from 'react';
import styles from './Card.module.css';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
  style,
}) => {
  const cardClasses = [
    styles.card,
    styles[`padding-${padding}`],
    hover && styles.hover,
    onClick && styles.clickable,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const Component = onClick ? motion.div : 'div';
  const props = onClick
    ? {
        onClick,
        whileHover: { scale: 1.02, y: -2 },
        whileTap: { scale: 0.98 },
        style,
      }
    : { style };

  return (
    <Component className={cardClasses} {...props}>
      {children}
    </Component>
  );
};

export default Card;


