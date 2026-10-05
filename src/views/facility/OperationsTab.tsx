import { Clock, Mail, Phone } from 'lucide-react'
import { OperatingHoursDisplay } from '../../components/OperatingHoursDisplay'
import type { Facility } from '../../data/facilities'
import { getFacilityTopCustomers, TOP_CUSTOMERS_SOURCE_NOTE } from '../../data/facility-customers'
import type { FacilityContact, FacilityOperations } from '../../data/facility-operations'
import { formatFacilityNumber } from '../../lib/facility-display'

export function OperationsTab({ facility, operations }: { facility: Facility; operations?: FacilityOperations }) {
  const accountContacts = operations?.contacts.filter((contact) => contact.group === 'account-management') ?? []
  const operationsContacts = operations?.contacts.filter((contact) => contact.group === 'operations') ?? []

  return (
    <section className="facility-operations" aria-label={`Operations contacts for ${facility.fullAddress}`}>
      {/* The contact source note is kept in the data but not shown beside the heading. */}
      <header className="operations-heading">
        <div><span className="eyebrow">Facility operations</span><h2>Hours & contact heads</h2></div>
      </header>
      <section className="operations-hours" aria-labelledby="operations-hours-title">
        <div><Clock size={19} /><span><small>Facility {formatFacilityNumber(facility)}</small><h3 id="operations-hours-title">Operating hours</h3></span></div>
        <OperatingHoursDisplay facilityId={facility.id} variant="operations" />
      </section>
      {operations ? (
        <>
          {accountContacts.length > 0 && (
            <section className="operations-contact-group" aria-labelledby="account-contacts-title">
              <header><span className="eyebrow">Client team</span><h3 id="account-contacts-title">Account management</h3></header>
              <div className="operations-contact-grid">
                {accountContacts.map((contact) => <OperationsContactCard key={contact.id} contact={contact} />)}
              </div>
            </section>
          )}
          {operationsContacts.length > 0 && (
            <section className="operations-contact-group" aria-labelledby="operations-leaders-title">
              <header><span className="eyebrow">Facility team</span><h3 id="operations-leaders-title">Operations leaders</h3></header>
              <div className="operations-contact-grid">
                {operationsContacts.map((contact) => <OperationsContactCard key={contact.id} contact={contact} />)}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="operations-contacts-empty" role="status">
          <strong>Contacts pending review</strong>
          <span>No staff contacts were confidently matched to this facility.</span>
        </div>
      )}
      <TopCustomersSection facilityId={facility.id} />
    </section>
  )
}

function OperationsContactCard({ contact }: { contact: FacilityContact }) {
  const phones = contact.phones ?? (contact.phone && contact.phoneHref
    ? [{ label: 'Phone' as const, display: contact.phone, href: contact.phoneHref }]
    : [])

  return (
    <article className="operations-contact-card" data-contact-id={contact.id}>
      {contact.photoUrl ? (
        <img className="operations-contact-photo" src={contact.photoUrl} alt={`Portrait of ${contact.name}`} loading="lazy" />
      ) : (
        <span className="operations-contact-photo is-blank" role="img" aria-label={`Portrait not provided for ${contact.name}`} />
      )}
      <div className="operations-contact-copy">
        {contact.role && <span className="operations-contact-role">{contact.role}</span>}
        <h3>{contact.name}</h3>
        <address>
          {contact.email ? (
            <a href={`mailto:${contact.email}`}><Mail size={14} />{contact.email}</a>
          ) : (
            <span className="operations-contact-missing"><Mail size={14} />Email not provided</span>
          )}
          {phones.length > 0 ? (
            phones.map((phone) => (
              <a href={`tel:${phone.href}`} key={`${phone.label}-${phone.href}`}>
                <Phone size={14} />
                {phones.length > 1 && <small>{phone.label}</small>}
                {phone.display}
              </a>
            ))
          ) : (
            <span className="operations-contact-missing"><Phone size={14} />Phone not provided</span>
          )}
        </address>
      </div>
    </article>
  )
}

function TopCustomersSection({ facilityId }: { facilityId: string }) {
  const topCustomers = getFacilityTopCustomers(facilityId)
  return (
    <section className="operations-contact-group top-customers" aria-labelledby="top-customers-title" data-testid="top-customers">
      <header>
        <span className="eyebrow">Client base</span>
        <h3 id="top-customers-title">Top customers</h3>
      </header>
      {topCustomers ? (
        <>
          <ol className="top-customers-list">
            {topCustomers.customers.map((name, index) => <li key={`${index}-${name}`}><span>{index + 1}</span>{name}</li>)}
          </ol>
          <p className="top-customers-note">
            Ranked as listed for location {topCustomers.locationCode}{topCustomers.abbreviation ? ` · ${topCustomers.abbreviation}` : ''}. {TOP_CUSTOMERS_SOURCE_NOTE}
          </p>
        </>
      ) : (
        <p className="top-customers-note">No top customers have been provided for this facility yet.</p>
      )}
    </section>
  )
}
