import React from 'react';
import './Rating.css';

const Rating = ({ rating, setRating, hoverRating, setHoverRating }) => {
  return (
    <div className="rating-container">
      <p>Оценка заведения:</p>
      <div>
        {[...Array(5)].map((_, i) => {
          const starValue = i + 1;
          return (
            <span
              key={starValue}
              style={{
                cursor: 'pointer',
                color: (hoverRating || rating) >= starValue ? '#ffc107' : '#e4e5e9',
                fontSize: '24px',
                marginRight: '4px'
              }}
              onClick={() => setRating(starValue)}
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
            >
              ★
            </span>
          );
        })}
      </div>
      <p>{rating > 0 ? rating : '-'}</p>
    </div>
  );
};

export default Rating; 