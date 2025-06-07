import { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/router";
import Image from "next/image";

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
  contactVisibleUntil?: number;
  phone?: string;
}

export default function Home() {
  const [user] = useAuthState(auth);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [randomFrames, setRandomFrames] = useState<string[]>([]);
  const router = useRouter();

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

          if (userData.step === "profile") {
            router.push("/complete_profile");
            return;
          }

          if (userData.step === "verification") {
            router.push("/verify");
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
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Aucun profil disponible</h3>
        <p className="text-gray-600 max-w-md px-4 text-sm sm:text-base">
          Reviens bientôt pour découvrir de nouveaux profils près de toi.
        </p>
      </div>
    );
  };



  /* ==================== PROFILE CARD ==================== */
  const ProfileCard = ({ profile }: { profile: Profile }) => {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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
            </div>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              Vérifié
            </span>
          </div>

          <p className="mt-2 text-gray-700 line-clamp-2 text-sm">
            {profile.description}
          </p>

          {profile.tarifs && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              {profile.tarifs.un_coup && (
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-gray-500">1 coup</p>
                  <p className="font-semibold">{profile.tarifs.un_coup} CFA</p>
                </div>
              )}
              {profile.tarifs.deux_coups && (
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-gray-500">2 coups</p>
                  <p className="font-semibold">{profile.tarifs.deux_coups} CFA</p>
                </div>
              )}
              {profile.tarifs.nuit && (
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-gray-500">Nuit</p>
                  <p className="font-semibold">{profile.tarifs.nuit} CFA</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => user ? alert("Paiement à venir !") : router.push("/login")}
            className="mt-4 w-full py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition"
          >
            Voir le contact
          </button>
        </div>
      </div>
    );
  };

  /* ==================== HEADER ==================== */
  const Header = () => (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="focus:outline-none">
            <Image
              src="/logo.png"
              alt="Logo"
              width={160}
              height={60}
              priority
            />

          </button>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={() => auth.signOut()}
                className="px-4 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200 transition"
              >
                Déconnexion
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-1.5 text-sm rounded-full border hover:bg-gray-50 transition"
                >
                  Connexion
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-1.5 text-sm rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition"
                >
                  S'inscrire
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  /* ==================== MAIN CONTENT ==================== */
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-end items-center mb-6">
          <button
            onClick={() => window.location.reload()}
            className="text-sm flex items-center text-gray-500 hover:text-gray-700"
          >
            <RefreshIcon className="h-4 w-4 mr-1" />
            Actualiser
          </button>
        </div>


        {loading ? renderShimmer() : profiles.length === 0 ? renderEmpty() : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <ProfileCard key={profile.uid} profile={profile} />
            ))}
          </div>
        )}
      </main>
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