import { useState } from 'react';
import { useConnection } from 'wagmi';
import { isAddress } from 'viem';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  GraduationCap,
  LayoutGrid,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import ConnectWallet from './components/ConnectWallet.jsx';
import RegisterStudent from './components/RegisterStudent.jsx';
import StudentList from './components/StudentList.jsx';
import StudentProfile from './components/StudentProfile.jsx';
import { useStudent } from './hooks/useStudent.js';
import { useStudentDirectory } from './hooks/useStudentDirectory.js';
import { CHAIN_ID, EXPLORER_URL, STUDENT_REGISTRATION_ADDRESS } from './config/contracts.js';

const RECENT_KEY = `campus:confirmed:${CHAIN_ID}:${STUDENT_REGISTRATION_ADDRESS.toLowerCase()}`;

function loadRecent() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(saved)
      ? saved
          .filter((address) => typeof address === 'string' && isAddress(address, { strict: false }))
          .slice(-100)
      : [];
  } catch {
    return [];
  }
}

export default function App() {
  const { address, chainId } = useConnection();
  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState('overview');
  const [recentAddresses, setRecentAddresses] = useState(loadRecent);
  const student = useStudent(address);
  const directory = useStudentDirectory(recentAddresses);
  const students = directory.data?.students;
  const courseCount = students
    ? new Set(students.map((record) => record.course.toLowerCase().trim())).size
    : null;
  const partial = directory.data && (!directory.data.complete || directory.isError);
  const openWallet = () => setWalletOpen(true);

  function onRegistered(newAddress) {
    setRecentAddresses((current) => {
      const next = [
        ...new Set([...current.map((item) => item.toLowerCase()), newAddress.toLowerCase()]),
      ].slice(-100);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* The live history remains the primary address source. */
      }
      return next;
    });
  }

  function navigate(id) {
    setSection(id);
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <a href="#overview" className="brand" onClick={() => navigate('overview')}>
          <span className="brand-icon">
            <GraduationCap size={27} strokeWidth={1.7} />
          </span>
          <span>
            campus<span className="brand-period">.</span>
            <small>STUDENT REGISTRY</small>
          </span>
        </a>
        <button
          className="icon-button mobile-close"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        >
          <X size={21} />
        </button>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutGrid },
            { id: 'my-profile', label: 'My student card', icon: UserRound },
            { id: 'directory', label: 'Student directory', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`nav-link ${section === id ? 'active' : ''}`}
              aria-current={section === id ? 'location' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === 'directory' && students && (
                <span className="nav-count">{students.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-icon">
              <Sparkles size={19} />
            </span>
            <h3>
              Big journeys.
              <br />
              One small step.
            </h3>
            <p>Make your student journey official.</p>
            <a href="#register" onClick={() => navigate('register')}>
              Get registered
              <ArrowUpRight size={16} />
            </a>
          </div>
          <a
            className="contract-link"
            href={`${EXPLORER_URL}/address/${STUDENT_REGISTRATION_ADDRESS}#code`}
            target="_blank"
            rel="noreferrer"
          >
            <ShieldCheck size={17} />
            View student contract
            <ArrowUpRight size={14} />
          </a>
          <div className="sidebar-network">
            <span className="status-dot" />
            Sepolia test network
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>Overview</strong>
          </div>
          <div className="header-actions">
            <span className="network-pill">
              <span className="status-dot" />
              Sepolia
            </span>
            <ConnectWallet
              open={walletOpen}
              onOpen={openWallet}
              onClose={() => setWalletOpen(false)}
            />
          </div>
        </header>
        <main id="main">
          <section id="overview" className="welcome-section">
            <div className="welcome-copy">
              <span className="eyebrow welcome-eyebrow">
                <span />
                THE NEXT CHAPTER IS YOURS
              </span>
              <h1>
                A place for every
                <br />
                <span>bright mind.</span>
              </h1>
              <p>
                Make it official. Register as a student, find your record,
                <br className="desktop-break" /> and discover the community you’re part of.
              </p>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <span className="art-star star-one">✦</span>
              <span className="art-star star-two">✧</span>
              <div className="art-card art-card-back" />
              <div className="art-card art-card-front">
                <span className="art-card-label">A WORLD OF POSSIBILITY</span>
                <GraduationCap size={62} strokeWidth={1.25} />
                <div className="art-card-text">
                  Your future.
                  <br />
                  On the record.
                </div>
                <span className="art-card-footer">
                  CAMPUS <span>↗</span>
                </span>
              </div>
              <span className="art-check">
                <Check size={23} />
              </span>
            </div>
          </section>
          <section className="stats-grid" aria-label="Registry overview">
            <div className="stat-card">
              <span className="stat-icon stat-purple">
                <Users size={21} />
              </span>
              <div>
                <span className="stat-label">Registered students{partial ? ' · partial' : ''}</span>
                <div className="stat-value">
                  {students ? students.length.toLocaleString() : '—'}
                  <span>and counting</span>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon stat-orange">
                <BookOpen size={21} />
              </span>
              <div>
                <span className="stat-label">Courses represented</span>
                <div className="stat-value">
                  {courseCount ?? '—'}
                  <span>different paths</span>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon stat-green">
                <ShieldCheck size={21} />
              </span>
              <div>
                <span className="stat-label">My registration</span>
                <div className="stat-value stat-status">
                  {!address
                    ? 'Not connected'
                    : student.isPending
                      ? 'Checking…'
                      : student.isError
                        ? 'Unavailable'
                        : student.data?.registered
                          ? 'Registered'
                          : 'Not registered'}
                </div>
              </div>
            </div>
          </section>
          <div className="registration-grid">
            <RegisterStudent
              address={address}
              chainId={chainId}
              student={student}
              onConnect={openWallet}
              onRegistered={onRegistered}
            />
            <StudentProfile address={address} student={student} onConnect={openWallet} />
          </div>
          <StudentList directory={directory} connectedAddress={address} />
          <footer className="page-footer">
            <span>
              <GraduationCap size={16} />
              Made for your next chapter.
            </span>
            <span>
              Campus student registry <i /> Sepolia testnet
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
