import { Warehouse } from 'lucide-react'
import { formatAvailableSpace, formatBulkSquareFeet, formatRack, formatTotalSquareFeet, getFacilityBulkRack, getFacilitySquareFootage, hasReportedAvailableSpace } from '../data/facility-space'

/** Shows a reported value in bold, or the shared "Pending" placeholder in muted italics. */
function PendingOr({ value }: { value: string }) {
  return value === 'Pending' ? <em className="square-footage-pending">Pending</em> : <strong>{value}</strong>
}

export function SquareFootagePreview({ facilityId }: { facilityId: string }) {
  const { totalSquareFeet, available } = getFacilitySquareFootage(facilityId)
  const bulkRack = getFacilityBulkRack(facilityId)

  return (
    <span className="square-footage-preview" data-testid="square-footage-preview">
      <Warehouse size={12} />
      <span>
        <span data-testid="square-footage-total">Total <PendingOr value={formatTotalSquareFeet(totalSquareFeet)} /></span>
        {/* Available heads the bulk and rack lines; it shows a figure only when one is reported, never a Pending placeholder. */}
        <span data-testid="square-footage-available" data-available-status={available ? available.status ?? 'reported' : 'pending'}>
          Available{hasReportedAvailableSpace(available) && <> <strong>{formatAvailableSpace(available)}</strong></>}
        </span>
        {/* Bulk and rack hold a Pending placeholder until a site reports them; the Overview tab shows the full breakdown. */}
        <span className="square-footage-sub" data-testid="square-footage-bulk" data-reported={bulkRack?.bulkSquareFeet !== undefined ? 'true' : 'false'}>
          Bulk: <PendingOr value={formatBulkSquareFeet(bulkRack)} />
        </span>
        <span className="square-footage-sub" data-testid="square-footage-rack" data-reported={bulkRack?.rackPalletPositions !== undefined ? 'true' : 'false'}>
          Rack: <PendingOr value={formatRack(bulkRack)} />
        </span>
      </span>
    </span>
  )
}
