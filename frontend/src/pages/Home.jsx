import Navbar from '../components/Navbar/Navbar'
import Hero from '../components/Hero/Hero'
import About from '../components/About/About'
import Stats from '../components/Stats/Stats'
import Footer from '../components/Footer/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <About />
      </main>
      <Footer />
    </>
  )
}
