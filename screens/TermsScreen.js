import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const TermsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Conditions Générales d'Utilisation</Text>
      <Text style={styles.version}>Version 1.0 – Dernière mise à jour : 26/12/2024</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Objet de l'application</Text>
        <Text style={styles.sectionContent}>
          L'application Matchmaking Geek vise à offrir une plateforme d'échange, de partage et de mise
          en relation entre utilisateurs partageant des centres d'intérêt communs. Les fonctionnalités incluent :
        </Text>
        <Text style={styles.sectionContent}>- Création et gestion d'un profil utilisateur.</Text>
        <Text style={styles.sectionContent}>- Publication de topics et de commentaires.</Text>
        <Text style={styles.sectionContent}>- Interaction avec d'autres utilisateurs.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Inscription et création de compte</Text>
        <Text style={styles.sectionContent}>
          Pour accéder aux fonctionnalités de l'application, vous devez créer un compte :
        </Text>
        <Text style={styles.sectionContent}>- Fournir des informations exactes et à jour.</Text>
        <Text style={styles.sectionContent}>
          - Accepter la collecte et le traitement des données conformément à notre Politique de
          confidentialité.
        </Text>
        <Text style={styles.sectionContent}>
          Un e-mail de confirmation sera envoyé lors de la création du compte. Vous devez valider cet
          e-mail pour activer votre compte.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Données personnelles</Text>
        <Text style={styles.sectionContent}>
          Vos informations personnelles (e-mail, date de naissance, etc.) sont strictement privées et ne
          seront jamais affichées publiquement. Toutefois, elles peuvent être partagées avec nos
          partenaires tiers sous une forme anonymisée à des fins d’amélioration de l’expérience utilisateur ou
          à des fins commerciales. En aucun cas, vos données directement identifiables ne seront
          transmises sans votre consentement explicite. Vous pouvez consulter, modifier ou supprimer vos
          informations personnelles à tout moment via la section "Mon Profil".
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Utilisation de l'application</Text>
        <Text style={styles.sectionContent}>Vous vous engagez à :</Text>
        <Text style={styles.sectionContent}>- Respecter les autres utilisateurs et leurs opinions.</Text>
        <Text style={styles.sectionContent}>
          - Ne pas publier de contenu offensant, diffamatoire ou illégal.
        </Text>
        <Text style={styles.sectionContent}>
          - Ne pas utiliser l'application à des fins commerciales sans autorisation.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Modification des informations personnelles</Text>
        <Text style={styles.sectionContent}>
          Vous pouvez modifier vos informations à tout moment via votre profil. En cas de modification de
          votre mot de passe, un e-mail de confirmation sera envoyé pour valider cette action.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Responsabilités</Text>
        <Text style={styles.sectionContent}>
          <Text style={{ fontWeight: 'bold' }}>Utilisateur :</Text> Vous êtes responsable de vos publications et
          interactions sur l'application.
        </Text>
        <Text style={styles.sectionContent}>
          <Text style={{ fontWeight: 'bold' }}>Application :</Text> Nous nous efforçons de garantir un service de
          qualité, mais nous ne sommes pas responsables des interruptions temporaires ou des pertes de
          données.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Résiliation</Text>
        <Text style={styles.sectionContent}>
          Vous pouvez supprimer votre compte à tout moment via les paramètres de votre profil.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Propriété intellectuelle</Text>
        <Text style={styles.sectionContent}>
          Tous les contenus de l'application (logos, textes, graphismes) sont protégés par les lois sur la
          propriété intellectuelle. Toute reproduction ou utilisation non autorisée est interdite.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. Modifications des CGU</Text>
        <Text style={styles.sectionContent}>
          Nous nous réservons le droit de modifier les présentes Conditions Générales d’Utilisation à tout
          moment et sans préavis. Toute utilisation de l'application après une mise à jour des CGU constitue
          une acceptation implicite de ces modifications. Nous vous encourageons à consulter régulièrement
          cette section pour rester informé des éventuels changements.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. Contact</Text>
        <Text style={styles.sectionContent}>
          Pour toute question ou problème, veuillez nous contacter à : support@matchmakinggeek.com
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  version: { fontSize: 14, color: '#888', marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  sectionContent: { fontSize: 14, lineHeight: 20, color: '#333' },
});

export default TermsScreen;
