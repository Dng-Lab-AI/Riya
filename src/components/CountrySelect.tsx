"use client";

import { countryGroupLabel, countryName } from "@/i18n/catalog";
import { useLocale } from "@/i18n/client";
import { LAUNCH_COUNTRY, countryGroups, findCountry, isKnownCountry } from "@/lib/payments/countries";

// Country of residence: it decides the currency and the payment methods offered.
// The value stays the stored (French) name; only the label follows the visitor's language.
export function CountrySelect({ defaultValue, id = "country" }: { defaultValue?: string; id?: string }) {
  const locale = useLocale();
  // Older accounts typed their country freely ("cameroon"…): match it when we can.
  const known = findCountry(defaultValue).name;
  const value = isKnownCountry(known) ? known : LAUNCH_COUNTRY;
  return (
    <select id={id} name="country" defaultValue={value} autoComplete="country-name" className="input">
      {countryGroups().map(([group, names]) => (
        <optgroup key={group} label={countryGroupLabel(group, locale)}>
          {names.map((name) => <option key={name} value={name}>{countryName(name, locale)}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
