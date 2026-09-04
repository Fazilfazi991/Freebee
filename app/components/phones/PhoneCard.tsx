import { Link } from '@remix-run/react';
import { BatteryMedium, Scale, Smartphone } from 'lucide-react';
import type { Phone } from '~/lib/phones/schema';
import { format } from '~/lib/phones/format';

export function PhoneCard({ phone }: { phone: Phone }) {
  return (
    <article className="ph-card">
      <div className={`ph-device ph-${phone.brand}`} aria-hidden="true">
        <span></span>
      </div>
      <div className="ph-card-copy">
        <p>{phone.source.manufacturer}</p>
        <h2>
          <Link to={`/phones/${phone.brand}/${phone.slug}`}>{phone.model}</Link>
        </h2>
        <dl>
          <div>
            <Smartphone />
            <dt>Display</dt>
            <dd>
              {format.display(phone.display.sizeInches)} · {format.hz(phone.display.refreshRateMaxHz)}
            </dd>
          </div>
          <div>
            <Scale />
            <dt>Weight</dt>
            <dd>{format.weight(phone.dimensions.weightG)}</dd>
          </div>
          <div>
            <BatteryMedium />
            <dt>Battery</dt>
            <dd>
              {phone.battery.capacityMah
                ? format.battery(phone.battery.capacityMah)
                : `${phone.battery.videoPlaybackHours} hr video`}
            </dd>
          </div>
        </dl>
        <div className="ph-card-foot">
          <span>{format.storage(phone.memory.storageOptionsGb)}</span>
          <Link to={`/phones/compare?a=${phone.slug}`}>Compare</Link>
        </div>
      </div>
    </article>
  );
}
