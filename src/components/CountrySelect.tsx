import { LAUNCH_COUNTRY, countryGroups, findCountry, isKnownCountry } from "@/lib/payments/countries";

// Country of residence: it decides the currency and the payment methods offered.
export function CountrySelect({ defaultValue, id = "country" }: { defaultValue?: string; id?: string }) {
  // Older accounts typed their country freely ("cameroon"…): match it when we can.
  const known = findCountry(defaultValue).name;
  const value = isKnownCountry(known) ? known : LAUNCH_COUNTRY;
  return (
    <select id={id} name="country" defaultValue={value} autoComplete="country-name" className="input">
      {countryGroups().map(([group, names]) => (
        <optgroup key={group} label={group}>
          {names.map((name) => <option key={name} value={name}>{name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
