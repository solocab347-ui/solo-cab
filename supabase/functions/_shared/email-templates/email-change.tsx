/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Changement d'adresse email — SoloCab</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoSection}>
          <img src="https://solo-cab-to-lovable.lovable.app/logo-solocab.png" width="60" height="60" alt="SoloCab" style={logoImg} />
        </div>
        <Heading style={h1}>Confirmer le changement d'email</Heading>
        <Text style={text}>
          Vous avez demandé à changer votre adresse email de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          vers{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <div style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Confirmer le changement
          </Button>
        </div>
        <Text style={footer}>
          Si vous n'avez pas demandé ce changement, sécurisez votre compte immédiatement.
        </Text>
        <Text style={brand}>SoloCab — L'outil des chauffeurs VTC indépendants</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoImg = { margin: '0 auto', borderRadius: '12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const link = { color: '#4183f0', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const button = { backgroundColor: '#4183f0', color: '#ffffff', fontSize: '16px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 32px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 8px', textAlign: 'center' as const }
const brand = { fontSize: '11px', color: '#bbbbcc', textAlign: 'center' as const, margin: '0' }
