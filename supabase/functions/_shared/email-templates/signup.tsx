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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre adresse email — SoloCab</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoSection}>
          <img src="https://solocab.fr/logo-solocab.png" width="60" height="60" alt="SoloCab" style={logoImg} />
        </div>
        <Heading style={h1}>Bienvenue sur SoloCab ! 🎉</Heading>
        <Text style={text}>
          Merci de vous être inscrit sur <strong>SoloCab</strong>. Pour activer votre compte et accéder à votre espace, veuillez confirmer votre adresse email.
        </Text>
        <div style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            ✅ Valider mon adresse email
          </Button>
        </div>
        <Text style={smallText}>
          Ce lien est valable pendant 24 heures.
        </Text>
        <Text style={footer}>
          Si vous n'avez pas créé de compte SoloCab, ignorez cet email.
        </Text>
        <Text style={brand}>SoloCab — L'outil des chauffeurs VTC indépendants</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoImg = { margin: '0 auto', borderRadius: '12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const buttonSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const button = { backgroundColor: '#4183f0', color: '#ffffff', fontSize: '16px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 32px', textDecoration: 'none' }
const smallText = { fontSize: '12px', color: '#888899', lineHeight: '1.5', margin: '0 0 20px', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 8px', textAlign: 'center' as const }
const brand = { fontSize: '11px', color: '#bbbbcc', textAlign: 'center' as const, margin: '0' }
