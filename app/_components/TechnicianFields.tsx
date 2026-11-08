"use client";

import { useState } from "react";
import { TECHNICIAN_SKILLS, TUNISIA_GOVERNORATES } from "@/lib/constants/technician";

export type TechnicianFieldValues = {
  skills: string[];
  city: string;
  address: string;
  phone: string;
  yearsExperience: string;
  hourlyRateDT: string;
  isAvailable: boolean;
};

const EMPTY_VALUES: TechnicianFieldValues = {
  skills: [],
  city: "",
  address: "",
  phone: "",
  yearsExperience: "",
  hourlyRateDT: "",
  isAvailable: true,
};

// Inputs are controlled so that values survive the form reset React applies after a server action.
export default function TechnicianFields({
  initialValues,
  errors,
  showPhone = true,
  inputClass,
  labelClass,
}: {
  initialValues?: TechnicianFieldValues;
  errors?: Record<string, string[]>;
  /** The profile form already has its own phone input. */
  showPhone?: boolean;
  inputClass: (hasError: boolean) => string;
  labelClass: string;
}) {
  const [values, setValues] = useState(initialValues ?? EMPTY_VALUES);

  const set = <K extends keyof TechnicianFieldValues>(key: K, value: TechnicianFieldValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const toggleSkill = (skill: string) =>
    set(
      "skills",
      values.skills.includes(skill)
        ? values.skills.filter((item) => item !== skill)
        : [...values.skills, skill],
    );

  const fieldError = (name: string) =>
    errors?.[name]?.map((error) => (
      <p key={error} id={`${name}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    ));

  return (
    <fieldset className="space-y-5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Informations technicien
      </legend>

      <div>
        <span className={labelClass}>Spécialités *</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {TECHNICIAN_SKILLS.map((skill) => (
            <label
              key={skill.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
            >
              <input
                type="checkbox"
                name="skills"
                value={skill.value}
                checked={values.skills.includes(skill.value)}
                onChange={() => toggleSkill(skill.value)}
              />
              {skill.label}
            </label>
          ))}
        </div>
        {fieldError("skills")}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className={labelClass}>
            Gouvernorat *
          </label>
          <select
            id="city"
            name="city"
            value={values.city}
            onChange={(event) => set("city", event.target.value)}
            aria-invalid={!!errors?.city}
            className={inputClass(!!errors?.city)}
          >
            <option value="">Sélectionnez…</option>
            {TUNISIA_GOVERNORATES.map((governorate) => (
              <option key={governorate.name} value={governorate.name}>
                {governorate.name}
              </option>
            ))}
          </select>
          {fieldError("city")}
        </div>
        <div>
          <label htmlFor="address" className={labelClass}>
            Adresse
          </label>
          <input
            id="address"
            name="address"
            maxLength={200}
            placeholder="Rue, quartier"
            value={values.address}
            onChange={(event) => set("address", event.target.value)}
            aria-invalid={!!errors?.address}
            className={inputClass(!!errors?.address)}
          />
          {fieldError("address")}
        </div>
      </div>

      {showPhone && (
        <div>
          <label htmlFor="phone" className={labelClass}>
            Téléphone *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+216 12 345 678"
            value={values.phone}
            onChange={(event) => set("phone", event.target.value)}
            aria-invalid={!!errors?.phone}
            className={inputClass(!!errors?.phone)}
          />
          {fieldError("phone")}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="yearsExperience" className={labelClass}>
            Années d&apos;expérience
          </label>
          <input
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            min={0}
            max={60}
            value={values.yearsExperience}
            onChange={(event) => set("yearsExperience", event.target.value)}
            aria-invalid={!!errors?.yearsExperience}
            className={inputClass(!!errors?.yearsExperience)}
          />
          {fieldError("yearsExperience")}
        </div>
        <div>
          <label htmlFor="hourlyRateDT" className={labelClass}>
            Tarif horaire (DT)
          </label>
          <input
            id="hourlyRateDT"
            name="hourlyRateDT"
            type="number"
            min={0}
            max={1000}
            step="0.5"
            value={values.hourlyRateDT}
            onChange={(event) => set("hourlyRateDT", event.target.value)}
            aria-invalid={!!errors?.hourlyRateDT}
            className={inputClass(!!errors?.hourlyRateDT)}
          />
          {fieldError("hourlyRateDT")}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
        <input
          type="checkbox"
          name="isAvailable"
          checked={values.isAvailable}
          onChange={(event) => set("isAvailable", event.target.checked)}
        />
        Disponible pour de nouvelles interventions
      </label>
    </fieldset>
  );
}
