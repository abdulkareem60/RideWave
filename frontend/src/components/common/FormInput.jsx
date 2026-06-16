/**
 * FormInput — wraps an <input> with a label, error message, and consistent styling.
 * Integrates directly with react-hook-form via the `register` prop.
 *
 * Pass validation rules via the `rules` prop (the second argument react-hook-form's
 * register() normally takes) — do NOT also spread {...register(id, rules)} onto this
 * component. This component already calls register(id, rules) internally; spreading
 * the result onto FormInput as well attaches a ref to this function component, which
 * React can't forward without React.forwardRef(), and double-registers the field.
 */
export default function FormInput({
  label,
  id,
  type = 'text',
  register,
  rules,
  error,
  placeholder,
  autoComplete,
  className = '',
  ...rest
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`input ${error ? 'input-error' : ''}`}
        {...(register ? register(id, rules) : {})}
        {...rest}
      />
      {error && (
        <p className="text-xs text-red-600 mt-0.5">{error.message}</p>
      )}
    </div>
  );
}