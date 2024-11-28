/* eslint-disable no-restricted-imports */

import {
	FormattedMessage,
	IntlConfig,
	IntlShape,
	MessageDescriptor,
	PrimitiveType,
	createIntlCache,
	createIntl as originalCreateIntl,
	defineMessages as originalDefineMessages,
	useIntl,
} from 'react-intl'

import { FormatXMLElementFn } from 'intl-messageformat'
import MD5 from 'md5.js'
import { ComponentPropsWithoutRef } from 'react'

// Re-export everything and override below what we want to override.
// eslint-disable-next-line
export * from 'react-intl'

export function useMsg(
	message: MessageDescriptor,
	values?: Record<string, PrimitiveType | FormatXMLElementFn<string, string>>
) {
	const intl = useIntl()
	return intl.formatMessage(message, values)
}

const INTERNAL_LOCALES = ['xx-AE', 'xx-LS']

// This matches the extraction tool pattern:
//   --id-interpolation-pattern '[md5:contenthash:hex:10]'
function generateId({ id, description, defaultMessage }: MessageDescriptor) {
	if (id) {
		return id
	}

	return new MD5()
		.update(description ? `${defaultMessage}#${description}` : defaultMessage)
		.digest('hex')
		.slice(0, 10)
}

export function F(props: ComponentPropsWithoutRef<typeof FormattedMessage>) {
	const intl = useIntl()
	const id = generateId(props)
	let internalMessage = (props.defaultMessage || '') as string
	if (intl.locale === 'xx-AE') {
		internalMessage = makeAccented(internalMessage)
	} else if (intl.locale === 'xx-LS') {
		internalMessage = makeLong(internalMessage)
	}

	return (
		<span className="i18n-msg">
			{isInternalLocale(intl.locale) ? (
				<>{internalMessage}</>
			) : (
				/* eslint-disable-next-line formatjs/enforce-default-message */
				<FormattedMessage id={id} {...props} />
			)}
		</span>
	)
}

// We programmatically define ID's for messages to make things easier for devs.
export function defineMessages<
	K extends keyof any,
	T = MessageDescriptor,
	U extends Record<K, T> = Record<K, T>,
>(msgs: U): U {
	for (const key in msgs) {
		const message = msgs[key] as MessageDescriptor
		if (!message.id) {
			message.id = generateId(message)
		}
	}
	return originalDefineMessages(msgs as Record<string, MessageDescriptor>) as U
}

export function isInternalLocale(locale: string) {
	return INTERNAL_LOCALES.indexOf(locale) !== -1
}

function makeAccented(str: string) {
	const accents = 'áƃçđéƒǵȟíǰķłɱñóƥɋřšťúṽẃẍýž'
	return str.replace(/[a-zA-Z]/g, (char) => {
		const isUpper = char === char.toUpperCase()
		const index = char.toLowerCase().charCodeAt(0) - 97
		const accentedChar = accents[index] || char
		return isUpper ? accentedChar.toUpperCase() : accentedChar
	})
}

function makeLong(str: string) {
	return `${str}looooooooooooooooong`
}

// This is optional but highly recommended since it prevents memory leaks.
// See: https://formatjs.github.io/docs/react-intl/api/#createintl
const cache = createIntlCache()
let presetIntl: IntlShape | null = null
let didSetupCreateIntl = false
export function setupCreateIntl({ defaultLocale, locale, messages }: IntlConfig) {
	presetIntl = originalCreateIntl(
		{
			defaultLocale,
			locale,
			messages,
		},
		cache
	)

	didSetupCreateIntl = true
}

// createIntl is used in non-React locations.
export function createIntl(options?: IntlShape) {
	if (options) {
		return originalCreateIntl(options)
	} else {
		if (!didSetupCreateIntl) {
			throw new Error('Need to run setupCreateIntl to use createIntl without options.')
		}
		return presetIntl
	}
}