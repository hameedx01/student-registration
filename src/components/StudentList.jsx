import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { EXPLORER_URL, MULTICALL2_ADDRESS } from '../config/contracts.js';
import { friendlyError, initials, shortAddress } from '../utils/format.js';

const PAGE_SIZE = 8;

function exportCsv(students) {
  const escape = (value) => {
    const text = String(value);
    const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [
    ['Name', 'Age', 'Course', 'Wallet'],
    ...students.map((student) => [student.name, student.age, student.course, student.address]),
  ];
  const url = URL.createObjectURL(
    new Blob([rows.map((row) => row.map(escape).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'campus-students.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StudentList({ directory, connectedAddress }) {
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [page, setPage] = useState(0);
  const students = directory.data?.students ?? [];
  const courses = [...new Set(students.map((student) => student.course))].sort((a, b) =>
    a.localeCompare(b),
  );
  const query = search.trim().toLowerCase();
  const filtered = students.filter(
    (student) =>
      (!course || student.course === course) &&
      [student.name, student.course, student.address].some((value) =>
        value.toLowerCase().includes(query),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const incomplete = directory.data && !directory.data.complete;

  return (
    <section id="directory" className="panel directory-panel" aria-labelledby="directory-title">
      <div className="directory-heading">
        <div>
          <div className="directory-title-row">
            <h2 id="directory-title">The student directory</h2>
            <span className="count-pill">{directory.isPending ? '…' : students.length}</span>
          </div>
          <p className="section-description">Meet the minds that make up our community.</p>
        </div>
        <button
          className="button button-secondary export-button"
          disabled={!filtered.length}
          onClick={() => exportCsv(filtered)}
        >
          <ArrowDownToLine size={15} />
          Export list
        </button>
      </div>
      <div className="directory-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search students"
            placeholder="Search by name, course, or wallet…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filter by course"
          value={course}
          onChange={(event) => {
            setCourse(event.target.value);
            setPage(0);
          }}
        >
          <option value="">All courses</option>
          {courses.map((value) => (
            <option key={value} value={value}>
              {value || '(No course)'}
            </option>
          ))}
        </select>
        <button
          className="icon-button refresh-button"
          aria-label="Refresh student directory"
          title="Refresh directory"
          disabled={directory.isFetching}
          onClick={() => directory.refetch()}
        >
          <RefreshCw size={17} className={directory.isFetching ? 'spin' : ''} />
        </button>
      </div>
      {(incomplete || (directory.isError && directory.data)) && (
        <div role="status" className="directory-warning">
          <CircleAlert size={17} />
          <span>
            Some records may be missing or out of date. Refresh to try loading the full directory
            again.
          </span>
        </div>
      )}
      {directory.isPending ? (
        <div className="table-loading" role="status" aria-label="Loading student directory">
          {[0, 1, 2].map((row) => (
            <div className="skeleton-row" key={row}>
              <span className="skeleton avatar-skeleton" />
              <span className="skeleton line-skeleton" />
              <span className="skeleton line-skeleton short" />
            </div>
          ))}
        </div>
      ) : directory.isError && !directory.data ? (
        <div className="directory-empty">
          <CircleAlert size={30} />
          <h3>We couldn’t load the directory</h3>
          <p role="alert">{friendlyError(directory.error)}</p>
          <button
            className="button button-secondary"
            onClick={() => directory.refetch()}
            disabled={directory.isFetching}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="directory-empty">
          <Users size={30} />
          <h3>
            {search || course
              ? 'No students match your search'
              : 'The next chapter starts with you'}
          </h3>
          <p>
            {search || course
              ? 'Try another name, course, or wallet address.'
              : 'Registered students will appear here after their records are confirmed.'}
          </p>
          {(search || course) && (
            <button
              className="button button-secondary"
              onClick={() => {
                setSearch('');
                setCourse('');
                setPage(0);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">STUDENT</th>
                <th scope="col">COURSE</th>
                <th scope="col">AGE</th>
                <th scope="col">WALLET ADDRESS</th>
                <th scope="col">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((student, index) => (
                <tr key={student.address}>
                  <td>
                    <div className="student-cell">
                      <span className={`avatar avatar-tone-${index % 4}`} aria-hidden="true">
                        {initials(student.name)}
                      </span>
                      <span className="student-name">
                        {student.name || 'Unnamed student'}
                        {connectedAddress?.toLowerCase() === student.address.toLowerCase() && (
                          <span className="you-label">YOU</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="course-cell">{student.course || '—'}</td>
                  <td>{student.age}</td>
                  <td>
                    <a
                      className="address-link"
                      href={`${EXPLORER_URL}/address/${student.address}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`View wallet for ${student.name} on Etherscan`}
                    >
                      {shortAddress(student.address)}
                      <ArrowUpRight size={14} />
                    </a>
                  </td>
                  <td>
                    <span className="pill pill-success">
                      <span className="status-dot" />
                      Registered
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="directory-bottom">
        <span>
          {directory.isPending
            ? 'Finding student records…'
            : filtered.length
              ? `Showing ${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} students`
              : 'No students to display'}
        </span>
        <div className="pagination">
          <button
            className="icon-button"
            aria-label="Previous student page"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            {currentPage + 1} / {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next student page"
            disabled={currentPage + 1 >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="directory-footnote">
        <BadgeCheck size={14} />
        <span>
          Student details read together with{' '}
          <a
            href={`${EXPLORER_URL}/address/${MULTICALL2_ADDRESS}#code`}
            target="_blank"
            rel="noreferrer"
          >
            Multicall2
          </a>
          . New registrations may take a moment to appear.
        </span>
      </div>
    </section>
  );
}
