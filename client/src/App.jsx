import { Link, NavLink, Route, Routes } from 'react-router-dom';
import SummaryPage from './pages/SummaryPage.jsx';
import ApiSetupPage from './pages/ApiSetupPage.jsx';

export default function App() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">Student Evaluations</Link>
        <nav className="nav">
          <NavLink to="/" end>Summary</NavLink>
          <NavLink to="/api-setup">API setup</NavLink>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<SummaryPage />} />
          <Route path="/api-setup" element={<ApiSetupPage />} />
          <Route path="*" element={<p>Page not found. <Link to="/">Go to the summary</Link></p>} />
        </Routes>
      </main>
    </>
  );
}
