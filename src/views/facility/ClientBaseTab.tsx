import { useState } from 'react'
import type { Facility } from '../../data/facilities'
import { clientLogoNeedsDarkBackground, getClientLogo } from '../../data/client-logos'
import { getFacilityTopCustomers } from '../../data/facility-customers'

function ClientLogo({ name }: { name: string }) {
  const [failed, setFailed] = useState(false)
  const logo = getClientLogo(name)
  return (
    <span className={`client-logo${clientLogoNeedsDarkBackground(name) ? ' client-logo-dark' : ''}`} aria-hidden="true">
      {logo && !failed && <img src={logo} alt="" loading="lazy" onError={() => setFailed(true)} />}
    </span>
  )
}

export function ClientBaseTab({ facility }: { facility: Facility }) {
  const topCustomers = getFacilityTopCustomers(facility.id)
  return (
    <section className="facility-client-base" aria-labelledby="client-base-title" data-testid="client-base">
      <header className="client-base-heading"><span className="eyebrow">Client base</span><h2 id="client-base-title">Top customers</h2></header>
      <ol className="client-base-list">
        {topCustomers?.customers.map((name, index) => (
          <li key={`${index}-${name}`} data-client-name={name}>
            <span className="client-rank">{index + 1}</span><ClientLogo name={name} /><strong>{name}</strong>
          </li>
        ))}
      </ol>
    </section>
  )
}
