// import { useMemo, useState, useEffect } from "react";
// import { useAuth } from "../contexts/AuthContext";
// import Avatar from "../components/common/Avatar";
// import QRCode from "qrcode";
// import { getStudentCourses } from "../services/courseService";
// import { collectCourseIdsForStudent } from "../utils/helpers";

// // Simple inline SVG icons (no external deps)
// const Icon = ({ name, className = "w-5 h-5" }) => {
//   switch (name) {
//     case "user":
//       return (
//         <svg
//           className={className}
//           fill="none"
//           viewBox="0 0 24 24"
//           stroke="currentColor"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
//           />
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M4.5 20.25a8.25 8.25 0 1115 0v.75H4.5v-.75z"
//           />
//         </svg>
//       );
//     case "mail":
//       return (
//         <svg
//           className={className}
//           fill="none"
//           viewBox="0 0 24 24"
//           stroke="currentColor"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M21.75 7.5v9a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 16.5v-9A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5z"
//           />
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M3 7.5l8.25 5.25L19.5 7.5"
//           />
//         </svg>
//       );
//     case "badge":
//       return (
//         <svg
//           className={className}
//           fill="none"
//           viewBox="0 0 24 24"
//           stroke="currentColor"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M9 12l2 2 4-4"
//           />
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M7.5 4.5h9a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0116.5 19.5h-9A2.25 2.25 0 015.25 17.25V6.75A2.25 2.25 0 017.5 4.5z"
//           />
//         </svg>
//       );
//     case "phone":
//       return (
//         <svg
//           className={className}
//           fill="none"
//           viewBox="0 0 24 24"
//           stroke="currentColor"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M2.25 6.75A2.25 2.25 0 014.5 4.5h3a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 004.5 12v0c0 4.556 3.694 8.25 8.25 8.25v0a2.25 2.25 0 002.25-2.25v-1.5A2.25 2.25 0 0012.75 14.25H11.25A2.25 2.25 0 019 12v0"
//           />
//         </svg>
//       );
//     case "school":
//       return (
//         <svg
//           className={className}
//           fill="none"
//           viewBox="0 0 24 24"
//           stroke="currentColor"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M12 3l8.25 4.5L12 12 3.75 7.5 12 3z"
//           />
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M3.75 12L12 16.5 20.25 12"
//           />
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={1.5}
//             d="M12 12v9"
//           />
//         </svg>
//       );
//     default:
//       return null;
//   }
// };

// const Profile = () => {
//   const { user } = useAuth();

//   const role = user?.userType || user?.role || "student";
//   const [studentQR, setStudentQR] = useState("");
//   const studentId = useMemo(() => {
//     return (
//       user?.StudentID ??
//       user?.studentID ??
//       user?.studentId ??
//       user?.UserID ??
//       user?.userID ??
//       user?.userId ??
//       user?.id ??
//       user?.Id ??
//       null
//     );
//   }, [user]);
//   const displayRole =
//     role === "admin"
//       ? "Administrator"
//       : role === "teacher"
//       ? "Teacher"
//       : "Student";

//   // Robust fallbacks so the profile shows the logged-in user's actual data
//   const rawName = (
//     user?.name ||
//     user?.fullName ||
//     `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
//     ""
//   ).trim();
//   const email = user?.email || user?.Email || user?.username || "-";
//   const emailLocal = email && email !== "-" ? String(email).split("@")[0] : "";
//   const fullName = (
//     rawName ||
//     emailLocal ||
//     user?.username ||
//     user?.userName ||
//     ""
//   ).trim();
//   const capitalize = (s) =>
//     String(s || "")
//       .trim()
//       .replace(/\b\w/, (c) => c.toUpperCase());
//   const displayName = capitalize(fullName) || "User";
//   const phone =
//     user?.phone ||
//     user?.PhoneNumber ||
//     user?.phoneNumber ||
//     user?.mobile ||
//     "-";

//   // Pick fields by role without changing the underlying data
//   const fields = useMemo(() => {
//     const base = [
//       {
//         key: "Full Name",
//         value: fullName || "-",
//         icon: "user",
//       },
//       { key: "Email", value: email || "-", icon: "mail" },
//       {
//         key: "Phone",
//         value: phone || "-",
//         icon: "phone",
//       },
//     ];

//     if (role === "admin") {
//       return [
//         ...base,
//         { key: "Role", value: "Administrator", icon: "badge" },
//         {
//           key: "Department",
//           value: user?.department || "Administration",
//           icon: "school",
//         },
//       ];
//     }
//     if (role === "teacher") {
//       return [
//         ...base,
//         { key: "Role", value: "Teacher", icon: "badge" },
//         {
//           key: "Subject",
//           value: user?.subject || user?.specialty || "-",
//           icon: "school",
//         },
//       ];
//     }
//     // default student
//     return [
//       ...base,
//       { key: "Role", value: "Student", icon: "badge" },
//       {
//         key: "Grade/Year",
//         value: user?.grade || user?.year || "-",
//         icon: "school",
//       },
//     ];
//   }, [role, user]);

//   // Generate a QR for students only
//   useEffect(() => {
//     let cancelled = false;

//     const generateStudentQR = async () => {
//       if (role !== "student") {
//         if (!cancelled) {
//           setStudentQR("");
//         }
//         return;
//       }

//       if (!studentId) {
//         if (!cancelled) {
//           setStudentQR("");
//         }
//         return;
//       }

//       try {
//         let courses = [];

//         try {
//           const fetched = await getStudentCourses(studentId);
//           courses = Array.isArray(fetched) ? fetched : [];
//         } catch (fetchError) {
//           console.error("Failed to load courses for profile QR", fetchError);
//         }

//         const courseIds = collectCourseIdsForStudent(courses);

//         const payload = JSON.stringify({
//           studentId: String(studentId),
//           courseIds,
//         });

//         const dataUrl = await QRCode.toDataURL(payload);

//         if (!cancelled) {
//           setStudentQR(dataUrl);
//         }
//       } catch (e) {
//         console.error("Failed to generate student QR", e);
//         if (!cancelled) {
//           setStudentQR("");
//         }
//       }
//     };

//     generateStudentQR();

//     return () => {
//       cancelled = true;
//     };
//   }, [role, studentId]);

//   return (
//     <div className="space-y-8">
//       <div className="flex flex-col items-center gap-4">
//         <Avatar
//           name={displayName}
//           user={user}
//           src={user?.ProfilePicture || user?.profilePicture}
//           size="lg"
//           className="h-16 w-16 ring-2 ring-white/60 dark:ring-gray-900/60 shadow-lg bg-gradient-to-br from-indigo-500 to-violet-600"
//         />
//         <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
//           {displayName}
//         </h1>

//         <p className="text-sm text-gray-600 dark:text-gray-400">
//           {displayRole}
//         </p>

//         {role === "student" && (
//           <div className="flex flex-col items-center gap-3 mt-2">
//             {studentQR ? (
//               <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 shadow">
//                 <img
//                   src={studentQR}
//                   alt="Student QR"
//                   className="w-[80px] h-[80px]"
//                 />
//               </div>
//             ) : (
//               <div className="text-sm text-gray-500 dark:text-gray-400">
//                 Generating QR...
//               </div>
//             )}
//             {studentQR && (
//               <a
//                 href={studentQR}
//                 download={`student-${
//                   user?.id || user?.studentId || user?.StudentID || "qr"
//                 }.png`}
//                 className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md shadow-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//               >
//                 <svg
//                   className="w-4 h-4"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
//                   />
//                 </svg>
//                 Download QR Code
//               </a>
//             )}
//           </div>
//         )}
//       </div>

//       <div className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-6">
//         <dl className="divide-y divide-gray-100 dark:divide-gray-800">
//           {fields.map((f) => (
//             <div key={f.key} className="py-4 grid grid-cols-3 gap-4">
//               <dt className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
//                 <Icon
//                   name={f.icon}
//                   className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
//                 />
//                 {f.key}
//               </dt>
//               <dd className="col-span-2 text-sm text-gray-900 dark:text-white break-words">
//                 {String(f.value)}
//               </dd>
//             </div>
//           ))}
//         </dl>
//       </div>
//     </div>
//   );
// };

// export default Profile;


import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Avatar from "../components/common/Avatar";
import QRCode from "qrcode";
import { getStudentCourses } from "../services/courseService";
import { collectCourseIdsForStudent } from "../utils/helpers";

// Simple inline SVG icons (no external deps)
const Icon = ({ name, className = "w-5 h-5" }) => {
  switch (name) {
    case "user":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.5 20.25a8.25 8.25 0 1115 0v.75H4.5v-.75z"
          />
        </svg>
      );
    case "mail":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21.75 7.5v9a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 16.5v-9A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7.5l8.25 5.25L19.5 7.5"
          />
        </svg>
      );
    case "badge":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7.5 4.5h9a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0116.5 19.5h-9A2.25 2.25 0 015.25 17.25V6.75A2.25 2.25 0 017.5 4.5z"
          />
        </svg>
      );
    case "phone":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
// <<<<<<< HEAD
//             d="M2.25 6.75A2.25 2.25 0 014.5 4.5h3a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 004.5 12v0c0 4.556 3.694 8.25 8.25 8.25v0a2.25 2.25 0 002.25-2.25v-1.5A2.25 2.25 0 0012.75 14.25H11.25A2.25 2.25 0 019 12v0"
// =======
            d="M2.25 6.75A2.25 2.25 0 014.5 4.5h3a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 12v0c0 4.556 3.694 8.25 8.25 8.25v0a2.25 2.25 0 002.25-2.25v-1.5A2.25 2.25 0 0012.75 14.25H11.25A2.25 2.25 0 019 12v0"

          />
        </svg>
      );
    case "school":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 3l8.25 4.5L12 12 3.75 7.5 12 3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.75 12L12 16.5 20.25 12"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 12v9"
          />
        </svg>
      );
    case "download":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
          />
        </svg>
      );
    default:
      return null;
  }
};

const Profile = () => {
  const { user } = useAuth();

  const role = user?.userType || user?.role || "student";
  const [studentQR, setStudentQR] = useState("");
  const studentId = useMemo(() => {
    return (
      user?.StudentID ??
      user?.studentID ??
      user?.studentId ??
      user?.UserID ??
      user?.userID ??
      user?.userId ??
      user?.id ??
      user?.Id ??
      null
    );
  }, [user]);
  const displayRole =
    role === "admin"
      ? "Administrator"
      : role === "teacher"
      ? "Teacher"
      : "Student";

  // Robust fallbacks so the profile shows the logged-in user's actual data
  const rawName = (
    user?.name ||
    user?.fullName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    ""
  ).trim();
  const email = user?.email || user?.Email || user?.username || "-";
  const emailLocal = email && email !== "-" ? String(email).split("@")[0] : "";
  const fullName = (
    rawName ||
    emailLocal ||
    user?.username ||
    user?.userName ||
    ""
  ).trim();
  const capitalize = (s) =>
    String(s || "")
      .trim()
      .replace(/\b\w/, (c) => c.toUpperCase());
  const displayName = capitalize(fullName) || "User";
  const phone =
    user?.phone ||
    user?.PhoneNumber ||
    user?.phoneNumber ||
    user?.mobile ||
    "-";

  // Pick fields by role without changing the underlying data
  const fields = useMemo(() => {
    const base = [
      {
        key: "Full Name",
        value: fullName || "-",
        icon: "user",
      },
      { key: "Email", value: email || "-", icon: "mail" },
      {
        key: "Phone",
        value: phone || "-",
        icon: "phone",
      },
    ];

    if (role === "admin") {
      return [
        ...base,
        { key: "Role", value: "Administrator", icon: "badge" },
        {
          key: "Department",
          value: user?.department || "Administration",
          icon: "school",
        },
      ];
    }
    if (role === "teacher") {
      return [
        ...base,
        { key: "Role", value: "Teacher", icon: "badge" },
        {
          key: "Subject",
          value: user?.subject || user?.specialty || "-",
          icon: "school",
        },
      ];
    }
    // default student
    return [
      ...base,
      { key: "Role", value: "Student", icon: "badge" },
      {
        key: "Grade/Year",
        value: user?.grade || user?.year || "-",
        icon: "school",
      },
    ];
  }, [role, user]);

  // Generate a QR for students only
  useEffect(() => {
    let cancelled = false;

    const generateStudentQR = async () => {
      if (role !== "student") {
        if (!cancelled) {
          setStudentQR("");
        }
        return;
      }

      if (!studentId) {
        if (!cancelled) {
          setStudentQR("");
        }
        return;
      }

      try {
        let courses = [];

        try {
          const fetched = await getStudentCourses(studentId);
          courses = Array.isArray(fetched) ? fetched : [];
        } catch (fetchError) {
          console.error("Failed to load courses for profile QR", fetchError);
        }

        const courseIds = collectCourseIdsForStudent(courses);

        const payload = JSON.stringify({
          studentId: String(studentId),
          courseIds,
        });

        const dataUrl = await QRCode.toDataURL(payload);

        if (!cancelled) {
          setStudentQR(dataUrl);
        }
      } catch (e) {
        console.error("Failed to generate student QR", e);
        if (!cancelled) {
          setStudentQR("");
        }
      }
    };

    generateStudentQR();

    return () => {
      cancelled = true;
    };
  }, [role, studentId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/10 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-700 to-indigo-600 dark:from-white dark:via-blue-200 dark:to-indigo-300 bg-clip-text text-transparent mb-3">
            Profile
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Manage your account information and access credentials
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Card & QR */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 dark:border-gray-700/50 p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Avatar
                    name={displayName}
                    user={user}
                    src={user?.ProfilePicture || user?.profilePicture}
                    size="xl"
                    className="h-24 w-24 ring-4 ring-white/80 dark:ring-gray-700/80 shadow-2xl bg-gradient-to-br from-blue-500 to-indigo-600"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    {displayRole}
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {displayName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {email}
              </p>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  <Icon name="badge" className="w-4 h-4" />
                  Account Status
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Active
                </span>
              </div>
            </div>

            {/* QR Code Section */}
            {role === "student" && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 dark:border-gray-700/50 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                  Student QR Code
                </h3>
                
                <div className="flex flex-col items-center gap-4">
                  {studentQR ? (
                    <>
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800/50 shadow-inner">
                        <img
                          src={studentQR}
                          alt="Student QR Code"
                          className="w-48 h-48 mx-auto"
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Scan this QR code for quick access to your student information
                      </p>
                      <a
                        href={studentQR}
                        download={`student-${
                          user?.id || user?.studentId || user?.StudentID || "qr"
                        }.png`}
                        className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 text-base font-semibold rounded-xl shadow-lg transition-all duration-200 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:-translate-y-0.5"
                      >
                        <Icon name="download" className="w-5 h-5" />
                        Download QR Code
                      </a>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse flex items-center justify-center">
                        <div className="text-gray-500 dark:text-gray-400 text-sm">
                          Generating QR...
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        Preparing your student QR code
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Information */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 dark:border-gray-700/50 p-8 h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Icon name="user" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fields.map((field, index) => (
                  <div 
                    key={field.key}
                    className="group bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-900/10 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                        <Icon 
                          name={field.icon} 
                          className="w-5 h-5 text-blue-600 dark:text-blue-400" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          {field.key}
                        </h4>
                        <p className="text-lg font-medium text-gray-900 dark:text-white break-words">
                          {String(field.value)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Info Section */}
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl p-6 border border-green-100 dark:border-green-800/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Account Security
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your account is secured with industry-standard encryption and regular security updates.
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10 rounded-2xl p-6 border border-purple-100 dark:border-purple-800/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Last Updated
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Profile information is synchronized in real-time across all your devices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
