import { Routes, Route } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-[#e0e0e0] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Песенник</h1>
        <p className="text-lg text-gray-400">Скоро здесь будут песни</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
