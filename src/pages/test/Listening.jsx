import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function Listening() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const section = params.get('section');
  
  if (section === 'full_test' || section === 'collections') {
    return <Navigate to={`/listening/full${location.search}`} replace />;
  }
  return <Navigate to={`/listening/parts${location.search}`} replace />;
}
