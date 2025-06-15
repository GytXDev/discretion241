import { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/router";
import Image from "next/image";
import { FaBars } from "react-icons/fa";
import { FiChevronDown, FiChevronUp, FiFilter, FiLogIn, FiLogOut, FiUser, FiUserPlus, FiX, FiXCircle } from "react-icons/fi";
import PrivacyModal from "./privacy_modal";
import PaymentButton from "./payment/payment_button";
import TermsModal from "./terms_modal";

interface Profile {
  uid: string;
  pseudo: string;
  genre: string;
  age: number;
  description: string;
  tarifs?: {
    un_coup?: number;
    deux_coups?: number;
    nuit?: number;
  };
  deplace: boolean;
  recoit: boolean;
  ville: string;
  quartier?: string;
  photos: string[];
  contact?: string;
}

export default function Home() {
  const [user] = useAuthState(auth);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [randomFrames, setRandomFrames] = useState<string[]>([]);
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const villes = ['Libreville', 'Franceville', 'Moanda', 'Port Gentil', 'Oyem'];

  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);
  const [selectedVille, setSelectedVille] = useState<string | null>(null);

  const AGE_RANGES = [
    { label: "18 – 22 ans", min: 18, max: 22 },
    { label: "22 – 25 ans", min: 22, max: 25 },
    { label: "26 – 31 ans", min: 26, max: 31 },
    { label: "31 ans et plus", min: 31, max: 99 },
  ];
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);


  /* ==================== RANDOM FRAMES ==================== */
  useEffect(() => {
    // Sélectionne 3 images aléatoires parmi les frames disponibles
    const frames = Array.from({ length: 5 }, (_, i) => `/frames/frame_${i + 1}.jpeg`);
    const shuffled = [...frames].sort(() => 0.5 - Math.random());
    setRandomFrames(shuffled.slice(0, 3));
  }, []);

  /* ==================== FIRESTORE ==================== */
  useEffect(() => {
    (async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          if (userData.contact && /^0[0-9]{8}$/.test(userData.contact)) {
            localStorage.setItem("user_phone", userData.contact);
          }

          if (userData.step === "profile") {
            router.push("/profile/complete_profile");
            return;
          }

          if (userData.step === "verification") {
            router.push("/profile/verify");
            return;
          }
        }
      }

      setLoading(true);
      try {
        const q = query(
          collection(db, "users"),
          where("isVerified", "==", true),
          where("type", "==", "proposer")
        );
        const snap = await getDocs(q);
        setProfiles(snap.docs.map((d) => d.data() as Profile));
      } catch (err) {
        console.error("Firestore error:", err);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, router]);


  const FilterBar = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="sticky top-[70px] z-40 bg-white/80 backdrop-blur-lg rounded-b-2xl shadow-md px-5 py-2 mb-6 border-b border-gray-200">
        {/* Titre + Icone cliquable */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 text-gray-700 font-semibold text-base sm:text-lg py-2"
        >
          <div className="flex items-center gap-2">
            <FiFilter className="text-purple-600" />
            Filtres personnalisés
          </div>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>

        {/* Contenu des filtres (visible seulement si isOpen) */}
        {isOpen && (
          <div className="pb-2">
            {/* Sélecteurs */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Âges */}
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map((range) => {
                  const isActive = selectedAgeRange === range.label;
                  return (
                    <button
                      key={range.label}
                      onClick={() =>
                        setSelectedAgeRange(isActive ? null : range.label)
                      }
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${isActive
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>

              {/* Ville */}
              <select
                value={selectedVille || ""}
                onChange={(e) => setSelectedVille(e.target.value || null)}
                className="text-sm px-3 py-1.5 rounded-full border bg-gray-50 border-gray-300 hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">Toutes les villes</option>
                {villes.map((ville) => (
                  <option key={ville} value={ville}>
                    {ville}
                  </option>
                ))}
              </select>

              {/* Réinitialiser */}
              {(selectedAgeRange || selectedVille) && (
                <button
                  onClick={() => {
                    setSelectedAgeRange(null);
                    setSelectedVille(null);
                  }}
                  className="flex items-center text-sm text-red-500 hover:text-red-600 gap-1"
                >
                  <FiXCircle className="text-base" />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };


  /* ==================== SHIMMER ==================== */
  const renderShimmer = () => (
    <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl overflow-hidden shadow-md animate-pulse">
          <div className="h-64 bg-gray-200" />
          <div className="p-4 space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );

  /* ==================== EMPTY STATE ==================== */
  const EMOJIS = ["🍆", "🍑", "😍", "🥵", "😈", "🙈", "🤫"];
  const renderEmpty = () => {
    const selectedEmojis = [...EMOJIS].sort(() => 0.5 - Math.random()).slice(0, 3);

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center relative overflow-hidden">
        <div className="relative h-[280px] sm:h-[360px] w-full max-w-4xl mb-12 z-10">
          {/* Gauche */}
          {randomFrames[0] && (
            <>
              <div className="absolute left-2 sm:left-[15%] rotate-[-6deg] w-32 sm:w-48 h-48 sm:h-72 rounded-2xl overflow-hidden shadow-xl border-4 border-white z-10">
                <Image src={randomFrames[0]} alt="Gauche" fill className="object-cover" />
              </div>
              <div
                className="absolute z-30 animate-float-up text-2xl"
                style={{
                  top: '4%',
                  left: 'calc(15% + 10px)',
                  animationDelay: '0s',
                }}
              >
                {selectedEmojis[0]}
              </div>
            </>
          )}

          {/* Centre */}
          {randomFrames[1] && (
            <>
              <div className="absolute left-1/2 -translate-x-1/2 w-36 sm:w-56 h-56 sm:h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white z-20 scale-105">
                <Image src={randomFrames[1]} alt="Centre" fill className="object-cover" />
              </div>
              <div
                className="absolute z-30 text-2xl animate-bounce-slow"
                style={{
                  top: '72%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  animationDelay: '0.2s',
                }}
              >
                {selectedEmojis[1]}
              </div>
            </>
          )}

          {/* Droite */}
          {randomFrames[2] && (
            <>
              <div className="absolute right-2 sm:right-[15%] rotate-[6deg] w-32 sm:w-48 h-48 sm:h-72 rounded-2xl overflow-hidden shadow-xl border-4 border-white z-10">
                <Image src={randomFrames[2]} alt="Droite" fill className="object-cover" />
              </div>
              <div
                className="absolute z-30 animate-float-up text-2xl"
                style={{
                  top: '4%',
                  right: 'calc(15% + 10px)',
                  animationDelay: '0.4s',
                }}
              >
                {selectedEmojis[2]}
              </div>
            </>
          )}
        </div>

        {/* Message */}
        {/* Texte adapté selon l'authentification */}
        {user ? (
          <>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              Aucun profil disponible
            </h3>
            <p className="text-gray-600 max-w-md px-4 text-sm sm:text-base">
              Reviens bientôt pour découvrir de nouveaux profils près de toi.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              Connecte-toi pour accéder aux profils
            </h3>
            <p className="text-gray-600 max-w-md px-4 text-sm sm:text-base mb-4">
              Sur Discretion241, seuls les membres connectés peuvent consulter les profils ou proposer leurs services dans un cadre discret et responsable.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/auth/login")}
                className="px-5 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                Se connecter
              </button>
              <button
                onClick={() => router.push("/auth/register")}
                className="px-5 py-2 rounded-full border border-purple-600 text-purple-600 hover:bg-purple-50 transition"
              >
                S'inscrire
              </button>
            </div>
          </>
        )}
      </div>
    );
  };



  /* ==================== PROFILE CARD ==================== */
  const ProfileCard = ({ profile }: { profile: Profile }) => {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [canSeeContact, setCanSeeContact] = useState(false);


    useEffect(() => {
      if (user) {
        getDoc(doc(db, "users", user.uid)).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const expiresAt = data?.contacts?.[profile.uid];
            if (expiresAt && Date.now() < expiresAt) {
              setCanSeeContact(true);
            }
          }
        });
      }
    }, [user, profile.uid]);

    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
        {/* Carousel */}
        <div className="relative w-full h-80 sm:h-[380px] overflow-hidden bg-black">
          {profile.photos.length > 0 ? (
            <>
              <Image
                src={profile.photos[currentPhotoIndex]}
                alt={`${profile.pseudo} ${currentPhotoIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition duration-500 ease-in-out"
              />
              {profile.photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex((prev) =>
                        (prev - 1 + profile.photos.length) % profile.photos.length
                      );
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white transition"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex((prev) =>
                        (prev + 1) % profile.photos.length
                      );
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white transition"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                    {profile.photos.map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-white w-4' : 'bg-white/70'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <PhotoIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                {profile.pseudo}, {profile.age}
              </h3>
              <p className="text-sm text-gray-500">
                {profile.genre} • {profile.ville}
                {profile.quartier && `, ${profile.quartier}`}
              </p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {profile.recoit && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                    📍 Reçoit
                  </span>
                )}
                {profile.deplace && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                    🚶🏽‍♀️ Se déplace
                  </span>
                )}
              </div>

            </div>
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-lime-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full shadow-sm ring-1 ring-emerald-200/60">
              <Image
                src="/icons/high-quality.png"
                alt="Vérifié"
                width={16}
                height={16}
                className="rounded-full drop-shadow-sm"
              />
              Vérifié
            </span>


          </div>

          <p className="mt-2 text-gray-700 line-clamp-2 text-sm">
            {profile.description}
          </p>

          {profile.tarifs &&
            (profile.tarifs.un_coup! > 0 || profile.tarifs.deux_coups! > 0 || profile.tarifs.nuit! > 0) ? (
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              {profile.tarifs.un_coup && profile.tarifs.un_coup > 0 && (
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-gray-500">1 coup</p>
                  <p className="font-semibold">{profile.tarifs.un_coup} CFA</p>
                </div>
              )}
              {profile.tarifs.deux_coups && profile.tarifs.deux_coups > 0 && (
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-gray-500">2 coups</p>
                  <p className="font-semibold">{profile.tarifs.deux_coups} CFA</p>
                </div>
              )}
              {profile.tarifs.nuit && profile.tarifs.nuit > 0 && (
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-gray-500">Nuit</p>
                  <p className="font-semibold">{profile.tarifs.nuit} CFA</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-black-600 italic text-center mt-2">
              💌 Les détails se découvrent en privé... écris-lui pour en savoir plus.
            </p>
          )}

          {user ? (
            user.uid === profile.uid || canSeeContact ? (
              <div className="mt-4 py-2 w-full text-center rounded-full bg-green-100 text-green-800 font-semibold">
                <div className="flex items-center justify-center gap-2 text-green-300 font-semibold">
                  <img src="/icons/whatsapp.png" alt="WhatsApp" className="w-5 h-5" />
                  <a
                    href={`https://wa.me/241${profile.contact}?text=Bonjour ${profile.pseudo}, je suis intéressé(e) par ton profil vu sur Discretion241.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-800 hover:text-purple-600 font-medium transition"
                  >
                    {profile.contact}
                  </a>


                </div>
              </div>
            ) : (
              <PaymentButton
                profileName={profile.pseudo}
                profileUid={profile.uid}
                  onSuccess={async () => {
                    const now = Date.now();
                    const duration = 24 * 60 * 60 * 1000;

                    // 1. Ajouter le contact temporaire
                    await updateDoc(doc(db, "users", user.uid), {
                      [`contacts.${profile.uid}`]: now + duration
                    });

                    // 2. Enregistrer le paiement dans la collection "payments"
                    await addDoc(collection(db, "payments"), {
                      paidBy: user.uid,
                      forProfile: profile.uid,
                      timestamp: new Date(),
                      type: "contact_view"
                    });

                    // 3. Mettre à jour l'état local pour affichage
                    setCanSeeContact(true);
                  }}

              />
            )
          ) : (
            <button
              onClick={() => router.push("/auth/login")}
              className="mt-4 w-full py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition"
            >
              Voir le contact
            </button>
          )}




        </div>
      </div>
    );
  };

  /* ==================== HEADER ==================== */
  const Header = () => {
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
      if (user) {
        getDoc(doc(db, "users", user.uid)).then((doc) => {
          if (doc.exists()) {
            setUserData(doc.data());
          }
        });
      }
    }, [user]);

    return (
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <button onClick={() => router.push("/")} className="focus:outline-none">
              <Image
                src="/logo.png"
                alt="Logo"
                width={120}
                height={45}
                className="sm:w-[160px] sm:h-[60px]"
                priority
              />
            </button>

            {/* Desktop Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <>
                  {userData?.role === "admin" && (
                    <button
                      onClick={() => router.push("/admin/verify")}
                      className="px-4 py-1.5 text-sm rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition"
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={() => router.push("/profile/profile")}
                    className="px-4 py-1.5 text-sm rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 transition"
                  >
                    Mon compte
                  </button>
                  <button
                    onClick={() => auth.signOut()}
                    className="px-4 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200 transition"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="px-4 py-1.5 text-sm rounded-full border hover:bg-gray-50 transition"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => router.push("/auth/register")}
                    className="px-4 py-1.5 text-sm rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition"
                  >
                    S'inscrire
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 rounded-md hover:bg-gray-100 transition"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <FiX className="text-xl text-gray-700" />
              ) : (
                <FaBars className="text-xl text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-0 left-0 right-0 z-40 sm:hidden bg-white/90 backdrop-blur-md rounded-b-2xl shadow-lg max-h-[90vh] overflow-y-auto">
            {/* Bouton fermer en haut à droite */}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition"
                aria-label="Fermer"
              >
                <FiX className="text-xl text-gray-700" />
              </button>
            </div>

            {/* Contenu en haut, sans centrage vertical */}
            <div className="flex flex-col items-center px-6 pt-20 mb-6">
              <nav className="w-full max-w-sm space-y-4">
                {user ? (
                  <>
                    {userData?.role === "admin" && (
                      <button
                        onClick={() => {
                          router.push("/admin/verify");
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-6 py-4 rounded-lg text-red-800 hover:bg-red-100 transition text-lg font-medium"
                      >
                        <FiUser className="text-xl" />
                        <span>Admin</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        router.push("/profile/profile");
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-6 py-4 rounded-lg text-gray-800 hover:bg-gray-100 transition text-lg font-medium"
                    >
                      <FiUser className="text-xl" />
                      <span>Mon compte</span>
                    </button>
                    <button
                      onClick={() => {
                        auth.signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-6 py-4 rounded-lg text-gray-800 hover:bg-gray-100 transition text-lg font-medium"
                    >
                      <FiLogOut className="text-xl" />
                      <span>Déconnexion</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        router.push("/auth/login");
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-6 py-4 rounded-lg text-gray-800 hover:bg-gray-100 transition text-lg font-medium"
                    >
                      <FiLogIn className="text-xl" />
                      <span>Connexion</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push("/auth/login");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition flex items-center justify-center gap-3 text-lg"
                    >
                      <FiUserPlus className="text-xl" />
                      <span>S'inscrire</span>
                    </button>
                  </>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>
    );
  };

  /* ==================== MAIN CONTENT ==================== */
  const filteredProfiles = user
    ? profiles.filter((profile) => {
      if (selectedVille && profile.ville !== selectedVille) return false;
      if (selectedAgeRange) {
        const range = AGE_RANGES.find(r => r.label === selectedAgeRange);
        if (range && (profile.age < range.min || profile.age > range.max)) return false;
      }
      return true;
    })
    : [];


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <FilterBar />

        {loading ? renderShimmer() : filteredProfiles.length === 0 ? renderEmpty() : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <ProfileCard key={profile.uid} profile={profile} />
            ))}
          </div>
        )}
      </main>
      <>
        {!hasAcceptedPrivacy && (
          <PrivacyModal onAccept={() => setHasAcceptedPrivacy(true)} />
        )}
        {hasAcceptedPrivacy && <TermsModal />}
      </>

    </div>

  );
}

// Icônes simplifiées
function ChevronLeftIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function PhotoIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function RefreshIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
  );
}