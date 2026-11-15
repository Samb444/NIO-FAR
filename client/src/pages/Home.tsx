import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { SectionVocale, SectionSuiviSansCompte, SectionTransparence } from '../components/HomeSections';
import { Categories } from '../components/Categories';
import { Commitment } from '../components/Commitment';
import { CallToAction } from '../components/CallToAction';

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <SectionVocale />
      <Categories />
      <SectionSuiviSansCompte />
      <SectionTransparence />
      <Commitment />
      <CallToAction />
    </>
  );
}
