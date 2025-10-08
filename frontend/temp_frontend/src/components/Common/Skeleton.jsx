import React from 'react';

const Skeleton = ({ 
  type = 'text', 
  width = '100%', 
  height = '1rem', 
  className = '',
  count = 1 
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`animate-pulse bg-gray-300 dark:bg-gray-600 rounded ${className}`}
      style={{ 
        width, 
        height,
        ...(type === 'circle' && { borderRadius: '50%' }),
        ...(type === 'rectangle' && { borderRadius: '0.375rem' })
      }}
    />
  ));

  return <>{skeletons}</>;
};

export default Skeleton;