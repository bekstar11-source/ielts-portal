import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function Reading() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const section = params.get('section');
  
  if (section === 'full_test' || section === 'set') {
    return <Navigate to={`/reading/full${location.search}`} replace />;
  }
  return <Navigate to={`/reading/parts${location.search}`} replace />;
}
