import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  Info,
  LoaderCircle,
  Wallet,
} from 'lucide-react';
import { CHAIN_ID, EXPLORER_URL } from '../config/contracts.js';
import { useRegisterStudent } from '../hooks/useRegisterStudent.js';
import { friendlyError, shortAddress } from '../utils/format.js';
import { validateRegistration } from '../utils/validation.js';

const phaseLabels = {
  checking: 'Checking registration…',
  wallet: 'Confirm in your wallet…',
  confirming: 'Confirming on Sepolia…',
};

export default function RegisterStudent({ address, chainId, student, onConnect, onRegistered }) {
  const [form, setForm] = useState({ name: '', age: '', course: '' });
  const [errors, setErrors] = useState({});
  const registration = useRegisterStudent(onRegistered);
  const alreadyRegistered = student.data?.registered;
  const wrongNetwork = Boolean(address) && chainId !== CHAIN_ID;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event) {
    event.preventDefault();
    if (!address) {
      onConnect();
      return;
    }
    if (wrongNetwork || registration.isPending || alreadyRegistered) return;
    const nextErrors = validateRegistration(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    registration.mutate({ ...form, address });
  }

  return (
    <section
      id="register"
      className="panel registration-panel"
      aria-labelledby="registration-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">MAKE IT OFFICIAL</span>
          <h2 id="registration-title">Register as a student</h2>
        </div>
        <span className="step-badge">01</span>
      </div>
      {alreadyRegistered ? (
        <div className="registration-complete">
          <span className="success-symbol">
            <CircleCheck size={32} />
          </span>
          <h3>You’re on the register.</h3>
          <p>
            Your student record is confirmed. Your connected wallet is all you need to find it
            again.
          </p>
          <a className="button button-secondary" href="#my-profile">
            View your student card
            <ArrowRight size={16} />
          </a>
        </div>
      ) : (
        <>
          <p className="section-description">
            A few details. One registration. Your place in the community.
          </p>
          <form onSubmit={submit} noValidate>
            <fieldset disabled={registration.isPending}>
              <div className="field">
                <label htmlFor="student-name">
                  Full name <span>*</span>
                </label>
                <input
                  id="student-name"
                  name="name"
                  autoComplete="name"
                  placeholder="e.g. Ada Okafor"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <small id="name-error" className="field-error">
                    {errors.name}
                  </small>
                )}
              </div>
              <div className="form-row">
                <div className="field age-field">
                  <label htmlFor="student-age">
                    Age <span>*</span>
                  </label>
                  <input
                    id="student-age"
                    name="age"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 21"
                    value={form.age}
                    onChange={(event) => update('age', event.target.value)}
                    aria-invalid={Boolean(errors.age)}
                    aria-describedby={errors.age ? 'age-error' : undefined}
                  />
                  {errors.age && (
                    <small id="age-error" className="field-error">
                      {errors.age}
                    </small>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="student-course">
                    Course of study <span>*</span>
                  </label>
                  <input
                    id="student-course"
                    name="course"
                    placeholder="e.g. Computer Science"
                    value={form.course}
                    onChange={(event) => update('course', event.target.value)}
                    aria-invalid={Boolean(errors.course)}
                    aria-describedby={errors.course ? 'course-error' : undefined}
                  />
                  {errors.course && (
                    <small id="course-error" className="field-error">
                      {errors.course}
                    </small>
                  )}
                </div>
              </div>
            </fieldset>
            <div className="form-wallet">
              <Wallet size={16} />
              <span>{address ? 'Registering wallet' : 'Your wallet is your student identity'}</span>
              {address && <code>{shortAddress(address)}</code>}
            </div>
            <button
              type="submit"
              className="button button-primary full-width registration-submit"
              disabled={
                registration.isPending || wrongNetwork || (Boolean(address) && student.isPending)
              }
            >
              {registration.isPending ? (
                <LoaderCircle size={18} className="spin" />
              ) : address ? (
                <ArrowRight size={18} />
              ) : (
                <Wallet size={18} />
              )}
              {registration.isPending
                ? phaseLabels[registration.phase]
                : wrongNetwork
                  ? 'Switch to Sepolia to register'
                  : address
                    ? student.isPending
                      ? 'Checking your registration…'
                      : 'Register student'
                    : 'Connect wallet to register'}
            </button>
            <p className="form-note">
              <Info size={14} />
              Your details will be public on Sepolia. Each wallet can register once.
            </p>
          </form>
        </>
      )}
      <div aria-live="polite">
        {registration.isError && (
          <p className="error-message" role="alert">
            {friendlyError(registration.error)}
          </p>
        )}
        {registration.phase === 'success' && (
          <p className="success-message">
            <Check size={16} />
            Registration confirmed on Sepolia.
          </p>
        )}
        {registration.transaction && (
          <a
            className="transaction-link"
            href={`${EXPLORER_URL}/tx/${registration.transaction.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            {registration.isPending
              ? `Track registration for ${shortAddress(registration.transaction.address)}`
              : 'View registration transaction'}
            <ArrowUpRight size={14} />
          </a>
        )}
      </div>
    </section>
  );
}
