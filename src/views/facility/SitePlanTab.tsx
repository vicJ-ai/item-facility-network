import { Maximize2 } from 'lucide-react'
import type { Facility } from '../../data/facilities'
import { sitePlanProvenanceLabel, type FacilitySitePlan } from '../../data/facility-site-plans'
import { formatSitePlanFact } from '../../lib/facility-display'

export function SitePlanTab({ facility, sitePlan }: { facility: Facility; sitePlan: FacilitySitePlan }) {
  return (
    <section className="site-plan-detail" aria-label={`Site plan for ${facility.fullAddress}`}>
      <header className="site-plan-heading">
        <div><span className="eyebrow">{sitePlanProvenanceLabel(sitePlan)}</span><h2>Property plan details</h2></div>
        <p>{sitePlan.sourceNote ?? 'Supplied property facts and plan details.'}</p>
      </header>
      <dl className="site-plan-facts">
        {sitePlan.facts.map((fact) => (
          <div key={fact.id}>
            <dt>{fact.label}</dt>
            <dd>{formatSitePlanFact(fact)}</dd>
            {fact.note && <dd className="fact-note">{fact.note}</dd>}
          </div>
        ))}
      </dl>
      <figure className="site-plan-figure">
        <a href={sitePlan.assetUrl} target="_blank" rel="noreferrer" aria-label="Open full-size site plan in a new tab">
          <img src={sitePlan.assetUrl} alt={sitePlan.alt} width={sitePlan.width} height={sitePlan.height} />
          <span><Maximize2 size={15} />Open full size</span>
        </a>
      </figure>
    </section>
  )
}
