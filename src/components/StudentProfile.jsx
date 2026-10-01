import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  UserRound,
  Wallet,
} from 'lucide-react';
import { EXPLORER_URL } from '../config/contracts.js';
import { friendlyError, initials, shortAddress } from '../utils/format.js';

export default function StudentProfile({ address, student, onConnect }) {
  const record = student.data;
  return (
    <section id="my-profile" className="panel profile-panel" aria-labelledby="profile-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR PLACE ON CAMPUS</span>
          <h2 id="profile-title">My student card</h2>
        </div>
        <UserRound size={22} className="subtle-icon" />
      </div>
      {!address ? (
        <div className="profile-empty">
          <div className="id-illustration" aria-hidden="true">
            <div className="id-punch" />
            <span className="id-avatar">
              <UserRound size={34} strokeWidth={1.6} />
            </span>
            <div className="id-lines">
              <i />
              <i />
            </div>
            <span className="id-seal">
              <GraduationCap size={17} />
            </span>
          </div>
          <h3>Your identity. Your journey.</h3>
          <p>Connect your wallet to see your registration status and student details.</p>
          <button className="button button-white" onClick={onConnect}>
            <Wallet size={16} />
            Connect wallet
            <ArrowRight size={16} />
          </button>
        </div>
      ) : student.isPending ? (
        <div className="profile-empty" role="status">
          <LoaderCircle size={30} className="spin" />
          <p>Finding your student record…</p>
        </div>
      ) : student.isError ? (
        <div className="profile-empty">
          <p role="alert">{friendlyError(student.error)}</p>
          <button
            className="button button-white"
            onClick={() => student.refetch()}
            disabled={student.isFetching}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      ) : !record?.registered ? (
        <div className="profile-empty">
          <span className="profile-symbol">
            <GraduationCap size={36} />
          </span>
          <span className="pill pill-neutral">Not registered yet</span>
          <h3>There’s a place for you here.</h3>
          <p>Complete your registration to create a student card for this wallet.</p>
          <a href="#register" className="button button-white">
            Get started
            <ArrowRight size={16} />
          </a>
        </div>
      ) : (
        <div className="student-card">
          <div className="student-card-top">
            <span className="avatar avatar-large">{initials(record.name)}</span>
            <span className="pill pill-success">
              <BadgeCheck size={14} />
              Registered
            </span>
          </div>
          <h3>{record.name}</h3>
          <p className="student-course">{record.course}</p>
          <dl className="student-facts">
            <div>
              <dt>AGE</dt>
              <dd>{record.age} years</dd>
            </div>
            <div>
              <dt>NETWORK</dt>
              <dd>
                <span className="status-dot" />
                Sepolia
              </dd>
            </div>
          </dl>
          <div className="card-wallet">
            <span>STUDENT WALLET</span>
            <a href={`${EXPLORER_URL}/address/${address}`} target="_blank" rel="noreferrer">
              {shortAddress(address)}
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      )}
      <div className="profile-footer">
        <BadgeCheck size={16} />
        <span>One wallet. One student identity.</span>
      </div>
    </section>
  );
}
