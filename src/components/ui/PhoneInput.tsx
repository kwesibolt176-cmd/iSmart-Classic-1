import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

// Full list of country codes with flags
const COUNTRY_CODES = [
  {
    "name": "Afghanistan",
    "code": "AF",
    "dial_code": "+93",
    "flag": "\ud83c\udde6\ud83c\uddeb"
  },
  {
    "name": "Albania",
    "code": "AL",
    "dial_code": "+355",
    "flag": "\ud83c\udde6\ud83c\uddf1"
  },
  {
    "name": "Algeria",
    "code": "DZ",
    "dial_code": "+213",
    "flag": "\ud83c\udde9\ud83c\uddff"
  },
  {
    "name": "Andorra",
    "code": "AD",
    "dial_code": "+376",
    "flag": "\ud83c\udde6\ud83c\udde9"
  },
  {
    "name": "Angola",
    "code": "AO",
    "dial_code": "+244",
    "flag": "\ud83c\udde6\ud83c\uddf4"
  },
  {
    "name": "Antigua and Barbuda",
    "code": "AG",
    "dial_code": "+1-268",
    "flag": "\ud83c\udde6\ud83c\uddec"
  },
  {
    "name": "Argentina",
    "code": "AR",
    "dial_code": "+54",
    "flag": "\ud83c\udde6\ud83c\uddf7"
  },
  {
    "name": "Armenia",
    "code": "AM",
    "dial_code": "+374",
    "flag": "\ud83c\udde6\ud83c\uddf2"
  },
  {
    "name": "Australia",
    "code": "AU",
    "dial_code": "+61",
    "flag": "\ud83c\udde6\ud83c\uddfa"
  },
  {
    "name": "Austria",
    "code": "AT",
    "dial_code": "+43",
    "flag": "\ud83c\udde6\ud83c\uddf9"
  },
  {
    "name": "Azerbaijan",
    "code": "AZ",
    "dial_code": "+994",
    "flag": "\ud83c\udde6\ud83c\uddff"
  },
  {
    "name": "Bahamas",
    "code": "BS",
    "dial_code": "+1-242",
    "flag": "\ud83c\udde7\ud83c\uddf8"
  },
  {
    "name": "Bahrain",
    "code": "BH",
    "dial_code": "+973",
    "flag": "\ud83c\udde7\ud83c\udded"
  },
  {
    "name": "Bangladesh",
    "code": "BD",
    "dial_code": "+880",
    "flag": "\ud83c\udde7\ud83c\udde9"
  },
  {
    "name": "Barbados",
    "code": "BB",
    "dial_code": "+1-246",
    "flag": "\ud83c\udde7\ud83c\udde7"
  },
  {
    "name": "Belarus",
    "code": "BY",
    "dial_code": "+375",
    "flag": "\ud83c\udde7\ud83c\uddfe"
  },
  {
    "name": "Belgium",
    "code": "BE",
    "dial_code": "+32",
    "flag": "\ud83c\udde7\ud83c\uddea"
  },
  {
    "name": "Belize",
    "code": "BZ",
    "dial_code": "+501",
    "flag": "\ud83c\udde7\ud83c\uddff"
  },
  {
    "name": "Benin",
    "code": "BJ",
    "dial_code": "+229",
    "flag": "\ud83c\udde7\ud83c\uddef"
  },
  {
    "name": "Bhutan",
    "code": "BT",
    "dial_code": "+975",
    "flag": "\ud83c\udde7\ud83c\uddf9"
  },
  {
    "name": "Bolivia",
    "code": "BO",
    "dial_code": "+591",
    "flag": "\ud83c\udde7\ud83c\uddf4"
  },
  {
    "name": "Bosnia and Herzegovina",
    "code": "BA",
    "dial_code": "+387",
    "flag": "\ud83c\udde7\ud83c\udde6"
  },
  {
    "name": "Botswana",
    "code": "BW",
    "dial_code": "+267",
    "flag": "\ud83c\udde7\ud83c\uddfc"
  },
  {
    "name": "Brazil",
    "code": "BR",
    "dial_code": "+55",
    "flag": "\ud83c\udde7\ud83c\uddf7"
  },
  {
    "name": "Brunei",
    "code": "BN",
    "dial_code": "+673",
    "flag": "\ud83c\udde7\ud83c\uddf3"
  },
  {
    "name": "Bulgaria",
    "code": "BG",
    "dial_code": "+359",
    "flag": "\ud83c\udde7\ud83c\uddec"
  },
  {
    "name": "Burkina Faso",
    "code": "BF",
    "dial_code": "+226",
    "flag": "\ud83c\udde7\ud83c\uddeb"
  },
  {
    "name": "Burundi",
    "code": "BI",
    "dial_code": "+257",
    "flag": "\ud83c\udde7\ud83c\uddee"
  },
  {
    "name": "Cabo Verde",
    "code": "CV",
    "dial_code": "+238",
    "flag": "\ud83c\udde8\ud83c\uddfb"
  },
  {
    "name": "Cambodia",
    "code": "KH",
    "dial_code": "+855",
    "flag": "\ud83c\uddf0\ud83c\udded"
  },
  {
    "name": "Cameroon",
    "code": "CM",
    "dial_code": "+237",
    "flag": "\ud83c\udde8\ud83c\uddf2"
  },
  {
    "name": "Canada",
    "code": "CA",
    "dial_code": "+1",
    "flag": "\ud83c\udde8\ud83c\udde6"
  },
  {
    "name": "Central African Republic",
    "code": "CF",
    "dial_code": "+236",
    "flag": "\ud83c\udde8\ud83c\uddeb"
  },
  {
    "name": "Chad",
    "code": "TD",
    "dial_code": "+235",
    "flag": "\ud83c\uddf9\ud83c\udde9"
  },
  {
    "name": "Chile",
    "code": "CL",
    "dial_code": "+56",
    "flag": "\ud83c\udde8\ud83c\uddf1"
  },
  {
    "name": "China",
    "code": "CN",
    "dial_code": "+86",
    "flag": "\ud83c\udde8\ud83c\uddf3"
  },
  {
    "name": "Colombia",
    "code": "CO",
    "dial_code": "+57",
    "flag": "\ud83c\udde8\ud83c\uddf4"
  },
  {
    "name": "Comoros",
    "code": "KM",
    "dial_code": "+269",
    "flag": "\ud83c\uddf0\ud83c\uddf2"
  },
  {
    "name": "Congo (Congo-Brazzaville)",
    "code": "CG",
    "dial_code": "+242",
    "flag": "\ud83c\udde8\ud83c\uddec"
  },
  {
    "name": "Congo (Democratic Republic)",
    "code": "CD",
    "dial_code": "+243",
    "flag": "\ud83c\udde8\ud83c\udde9"
  },
  {
    "name": "Costa Rica",
    "code": "CR",
    "dial_code": "+506",
    "flag": "\ud83c\udde8\ud83c\uddf7"
  },
  {
    "name": "Croatia",
    "code": "HR",
    "dial_code": "+385",
    "flag": "\ud83c\udded\ud83c\uddf7"
  },
  {
    "name": "Cuba",
    "code": "CU",
    "dial_code": "+53",
    "flag": "\ud83c\udde8\ud83c\uddfa"
  },
  {
    "name": "Cyprus",
    "code": "CY",
    "dial_code": "+357",
    "flag": "\ud83c\udde8\ud83c\uddfe"
  },
  {
    "name": "Czechia (Czech Republic)",
    "code": "CZ",
    "dial_code": "+420",
    "flag": "\ud83c\udde8\ud83c\uddff"
  },
  {
    "name": "Denmark",
    "code": "DK",
    "dial_code": "+45",
    "flag": "\ud83c\udde9\ud83c\uddf0"
  },
  {
    "name": "Djibouti",
    "code": "DJ",
    "dial_code": "+253",
    "flag": "\ud83c\udde9\ud83c\uddef"
  },
  {
    "name": "Dominica",
    "code": "DM",
    "dial_code": "+1-767",
    "flag": "\ud83c\udde9\ud83c\uddf2"
  },
  {
    "name": "Dominican Republic",
    "code": "DO",
    "dial_code": "+1-809",
    "flag": "\ud83c\udde9\ud83c\uddf4"
  },
  {
    "name": "Ecuador",
    "code": "EC",
    "dial_code": "+593",
    "flag": "\ud83c\uddea\ud83c\udde8"
  },
  {
    "name": "Egypt",
    "code": "EG",
    "dial_code": "+20",
    "flag": "\ud83c\uddea\ud83c\uddec"
  },
  {
    "name": "El Salvador",
    "code": "SV",
    "dial_code": "+503",
    "flag": "\ud83c\uddf8\ud83c\uddfb"
  },
  {
    "name": "Equatorial Guinea",
    "code": "GQ",
    "dial_code": "+240",
    "flag": "\ud83c\uddec\ud83c\uddf6"
  },
  {
    "name": "Eritrea",
    "code": "ER",
    "dial_code": "+291",
    "flag": "\ud83c\uddea\ud83c\uddf7"
  },
  {
    "name": "Estonia",
    "code": "EE",
    "dial_code": "+372",
    "flag": "\ud83c\uddea\ud83c\uddea"
  },
  {
    "name": "Eswatini",
    "code": "SZ",
    "dial_code": "+268",
    "flag": "\ud83c\uddf8\ud83c\uddff"
  },
  {
    "name": "Ethiopia",
    "code": "ET",
    "dial_code": "+251",
    "flag": "\ud83c\uddea\ud83c\uddf9"
  },
  {
    "name": "Fiji",
    "code": "FJ",
    "dial_code": "+679",
    "flag": "\ud83c\uddeb\ud83c\uddef"
  },
  {
    "name": "Finland",
    "code": "FI",
    "dial_code": "+358",
    "flag": "\ud83c\uddeb\ud83c\uddee"
  },
  {
    "name": "France",
    "code": "FR",
    "dial_code": "+33",
    "flag": "\ud83c\uddeb\ud83c\uddf7"
  },
  {
    "name": "Gabon",
    "code": "GA",
    "dial_code": "+241",
    "flag": "\ud83c\uddec\ud83c\udde6"
  },
  {
    "name": "Gambia",
    "code": "GM",
    "dial_code": "+220",
    "flag": "\ud83c\uddec\ud83c\uddf2"
  },
  {
    "name": "Georgia",
    "code": "GE",
    "dial_code": "+995",
    "flag": "\ud83c\uddec\ud83c\uddea"
  },
  {
    "name": "Germany",
    "code": "DE",
    "dial_code": "+49",
    "flag": "\ud83c\udde9\ud83c\uddea"
  },
  {
    "name": "Ghana",
    "code": "GH",
    "dial_code": "+233",
    "flag": "\ud83c\uddec\ud83c\udded"
  },
  {
    "name": "Greece",
    "code": "GR",
    "dial_code": "+30",
    "flag": "\ud83c\uddec\ud83c\uddf7"
  },
  {
    "name": "Grenada",
    "code": "GD",
    "dial_code": "+1-473",
    "flag": "\ud83c\uddec\ud83c\udde9"
  },
  {
    "name": "Guatemala",
    "code": "GT",
    "dial_code": "+502",
    "flag": "\ud83c\uddec\ud83c\uddf9"
  },
  {
    "name": "Guinea",
    "code": "GN",
    "dial_code": "+224",
    "flag": "\ud83c\uddec\ud83c\uddf3"
  },
  {
    "name": "Guinea-Bissau",
    "code": "GW",
    "dial_code": "+245",
    "flag": "\ud83c\uddec\ud83c\uddfc"
  },
  {
    "name": "Guyana",
    "code": "GY",
    "dial_code": "+592",
    "flag": "\ud83c\uddec\ud83c\uddfe"
  },
  {
    "name": "Haiti",
    "code": "HT",
    "dial_code": "+509",
    "flag": "\ud83c\udded\ud83c\uddf9"
  },
  {
    "name": "Honduras",
    "code": "HN",
    "dial_code": "+504",
    "flag": "\ud83c\udded\ud83c\uddf3"
  },
  {
    "name": "Hungary",
    "code": "HU",
    "dial_code": "+36",
    "flag": "\ud83c\udded\ud83c\uddfa"
  },
  {
    "name": "Iceland",
    "code": "IS",
    "dial_code": "+354",
    "flag": "\ud83c\uddee\ud83c\uddf8"
  },
  {
    "name": "India",
    "code": "IN",
    "dial_code": "+91",
    "flag": "\ud83c\uddee\ud83c\uddf3"
  },
  {
    "name": "Indonesia",
    "code": "ID",
    "dial_code": "+62",
    "flag": "\ud83c\uddee\ud83c\udde9"
  },
  {
    "name": "Iran",
    "code": "IR",
    "dial_code": "+98",
    "flag": "\ud83c\uddee\ud83c\uddf7"
  },
  {
    "name": "Iraq",
    "code": "IQ",
    "dial_code": "+964",
    "flag": "\ud83c\uddee\ud83c\uddf6"
  },
  {
    "name": "Ireland",
    "code": "IE",
    "dial_code": "+353",
    "flag": "\ud83c\uddee\ud83c\uddea"
  },
  {
    "name": "Israel",
    "code": "IL",
    "dial_code": "+972",
    "flag": "\ud83c\uddee\ud83c\uddf1"
  },
  {
    "name": "Italy",
    "code": "IT",
    "dial_code": "+39",
    "flag": "\ud83c\uddee\ud83c\uddf9"
  },
  {
    "name": "Ivory Coast",
    "code": "CI",
    "dial_code": "+225",
    "flag": "\ud83c\udde8\ud83c\uddee"
  },
  {
    "name": "Jamaica",
    "code": "JM",
    "dial_code": "+1-876",
    "flag": "\ud83c\uddef\ud83c\uddf2"
  },
  {
    "name": "Japan",
    "code": "JP",
    "dial_code": "+81",
    "flag": "\ud83c\uddef\ud83c\uddf5"
  },
  {
    "name": "Jordan",
    "code": "JO",
    "dial_code": "+962",
    "flag": "\ud83c\uddef\ud83c\uddf4"
  },
  {
    "name": "Kazakhstan",
    "code": "KZ",
    "dial_code": "+7",
    "flag": "\ud83c\uddf0\ud83c\uddff"
  },
  {
    "name": "Kenya",
    "code": "KE",
    "dial_code": "+254",
    "flag": "\ud83c\uddf0\ud83c\uddea"
  },
  {
    "name": "Kiribati",
    "code": "KI",
    "dial_code": "+686",
    "flag": "\ud83c\uddf0\ud83c\uddee"
  },
  {
    "name": "Kuwait",
    "code": "KW",
    "dial_code": "+965",
    "flag": "\ud83c\uddf0\ud83c\uddfc"
  },
  {
    "name": "Kyrgyzstan",
    "code": "KG",
    "dial_code": "+996",
    "flag": "\ud83c\uddf0\ud83c\uddec"
  },
  {
    "name": "Laos",
    "code": "LA",
    "dial_code": "+856",
    "flag": "\ud83c\uddf1\ud83c\udde6"
  },
  {
    "name": "Latvia",
    "code": "LV",
    "dial_code": "+371",
    "flag": "\ud83c\uddf1\ud83c\uddfb"
  },
  {
    "name": "Lebanon",
    "code": "LB",
    "dial_code": "+961",
    "flag": "\ud83c\uddf1\ud83c\udde7"
  },
  {
    "name": "Lesotho",
    "code": "LS",
    "dial_code": "+266",
    "flag": "\ud83c\uddf1\ud83c\uddf8"
  },
  {
    "name": "Liberia",
    "code": "LR",
    "dial_code": "+231",
    "flag": "\ud83c\uddf1\ud83c\uddf7"
  },
  {
    "name": "Libya",
    "code": "LY",
    "dial_code": "+218",
    "flag": "\ud83c\uddf1\ud83c\uddfe"
  },
  {
    "name": "Liechtenstein",
    "code": "LI",
    "dial_code": "+423",
    "flag": "\ud83c\uddf1\ud83c\uddee"
  },
  {
    "name": "Lithuania",
    "code": "LT",
    "dial_code": "+370",
    "flag": "\ud83c\uddf1\ud83c\uddf9"
  },
  {
    "name": "Luxembourg",
    "code": "LU",
    "dial_code": "+352",
    "flag": "\ud83c\uddf1\ud83c\uddfa"
  },
  {
    "name": "Madagascar",
    "code": "MG",
    "dial_code": "+261",
    "flag": "\ud83c\uddf2\ud83c\uddec"
  },
  {
    "name": "Malawi",
    "code": "MW",
    "dial_code": "+265",
    "flag": "\ud83c\uddf2\ud83c\uddfc"
  },
  {
    "name": "Malaysia",
    "code": "MY",
    "dial_code": "+60",
    "flag": "\ud83c\uddf2\ud83c\uddfe"
  },
  {
    "name": "Maldives",
    "code": "MV",
    "dial_code": "+960",
    "flag": "\ud83c\uddf2\ud83c\uddfb"
  },
  {
    "name": "Mali",
    "code": "ML",
    "dial_code": "+223",
    "flag": "\ud83c\uddf2\ud83c\uddf1"
  },
  {
    "name": "Malta",
    "code": "MT",
    "dial_code": "+356",
    "flag": "\ud83c\uddf2\ud83c\uddf9"
  },
  {
    "name": "Marshall Islands",
    "code": "MH",
    "dial_code": "+692",
    "flag": "\ud83c\uddf2\ud83c\udded"
  },
  {
    "name": "Mauritania",
    "code": "MR",
    "dial_code": "+222",
    "flag": "\ud83c\uddf2\ud83c\uddf7"
  },
  {
    "name": "Mauritius",
    "code": "MU",
    "dial_code": "+230",
    "flag": "\ud83c\uddf2\ud83c\uddfa"
  },
  {
    "name": "Mexico",
    "code": "MX",
    "dial_code": "+52",
    "flag": "\ud83c\uddf2\ud83c\uddfd"
  },
  {
    "name": "Micronesia",
    "code": "FM",
    "dial_code": "+691",
    "flag": "\ud83c\uddeb\ud83c\uddf2"
  },
  {
    "name": "Moldova",
    "code": "MD",
    "dial_code": "+373",
    "flag": "\ud83c\uddf2\ud83c\udde9"
  },
  {
    "name": "Monaco",
    "code": "MC",
    "dial_code": "+377",
    "flag": "\ud83c\uddf2\ud83c\udde8"
  },
  {
    "name": "Mongolia",
    "code": "MN",
    "dial_code": "+976",
    "flag": "\ud83c\uddf2\ud83c\uddf3"
  },
  {
    "name": "Montenegro",
    "code": "ME",
    "dial_code": "+382",
    "flag": "\ud83c\uddf2\ud83c\uddea"
  },
  {
    "name": "Morocco",
    "code": "MA",
    "dial_code": "+212",
    "flag": "\ud83c\uddf2\ud83c\udde6"
  },
  {
    "name": "Mozambique",
    "code": "MZ",
    "dial_code": "+258",
    "flag": "\ud83c\uddf2\ud83c\uddff"
  },
  {
    "name": "Myanmar (Burma)",
    "code": "MM",
    "dial_code": "+95",
    "flag": "\ud83c\uddf2\ud83c\uddf2"
  },
  {
    "name": "Namibia",
    "code": "NA",
    "dial_code": "+264",
    "flag": "\ud83c\uddf3\ud83c\udde6"
  },
  {
    "name": "Nauru",
    "code": "NR",
    "dial_code": "+674",
    "flag": "\ud83c\uddf3\ud83c\uddf7"
  },
  {
    "name": "Nepal",
    "code": "NP",
    "dial_code": "+977",
    "flag": "\ud83c\uddf3\ud83c\uddf5"
  },
  {
    "name": "Netherlands",
    "code": "NL",
    "dial_code": "+31",
    "flag": "\ud83c\uddf3\ud83c\uddf1"
  },
  {
    "name": "New Zealand",
    "code": "NZ",
    "dial_code": "+64",
    "flag": "\ud83c\uddf3\ud83c\uddff"
  },
  {
    "name": "Nicaragua",
    "code": "NI",
    "dial_code": "+505",
    "flag": "\ud83c\uddf3\ud83c\uddee"
  },
  {
    "name": "Niger",
    "code": "NE",
    "dial_code": "+227",
    "flag": "\ud83c\uddf3\ud83c\uddea"
  },
  {
    "name": "Nigeria",
    "code": "NG",
    "dial_code": "+234",
    "flag": "\ud83c\uddf3\ud83c\uddec"
  },
  {
    "name": "North Korea",
    "code": "KP",
    "dial_code": "+850",
    "flag": "\ud83c\uddf0\ud83c\uddf5"
  },
  {
    "name": "North Macedonia",
    "code": "MK",
    "dial_code": "+389",
    "flag": "\ud83c\uddf2\ud83c\uddf0"
  },
  {
    "name": "Norway",
    "code": "NO",
    "dial_code": "+47",
    "flag": "\ud83c\uddf3\ud83c\uddf4"
  },
  {
    "name": "Oman",
    "code": "OM",
    "dial_code": "+968",
    "flag": "\ud83c\uddf4\ud83c\uddf2"
  },
  {
    "name": "Pakistan",
    "code": "PK",
    "dial_code": "+92",
    "flag": "\ud83c\uddf5\ud83c\uddf0"
  },
  {
    "name": "Palau",
    "code": "PW",
    "dial_code": "+680",
    "flag": "\ud83c\uddf5\ud83c\uddfc"
  },
  {
    "name": "Palestine",
    "code": "PS",
    "dial_code": "+970",
    "flag": "\ud83c\uddf5\ud83c\uddf8"
  },
  {
    "name": "Panama",
    "code": "PA",
    "dial_code": "+507",
    "flag": "\ud83c\uddf5\ud83c\udde6"
  },
  {
    "name": "Papua New Guinea",
    "code": "PG",
    "dial_code": "+675",
    "flag": "\ud83c\uddf5\ud83c\uddec"
  },
  {
    "name": "Paraguay",
    "code": "PY",
    "dial_code": "+595",
    "flag": "\ud83c\uddf5\ud83c\uddfe"
  },
  {
    "name": "Peru",
    "code": "PE",
    "dial_code": "+51",
    "flag": "\ud83c\uddf5\ud83c\uddea"
  },
  {
    "name": "Philippines",
    "code": "PH",
    "dial_code": "+63",
    "flag": "\ud83c\uddf5\ud83c\udded"
  },
  {
    "name": "Poland",
    "code": "PL",
    "dial_code": "+48",
    "flag": "\ud83c\uddf5\ud83c\uddf1"
  },
  {
    "name": "Portugal",
    "code": "PT",
    "dial_code": "+351",
    "flag": "\ud83c\uddf5\ud83c\uddf9"
  },
  {
    "name": "Qatar",
    "code": "QA",
    "dial_code": "+974",
    "flag": "\ud83c\uddf6\ud83c\udde6"
  },
  {
    "name": "Romania",
    "code": "RO",
    "dial_code": "+40",
    "flag": "\ud83c\uddf7\ud83c\uddf4"
  },
  {
    "name": "Russia",
    "code": "RU",
    "dial_code": "+7",
    "flag": "\ud83c\uddf7\ud83c\uddfa"
  },
  {
    "name": "Rwanda",
    "code": "RW",
    "dial_code": "+250",
    "flag": "\ud83c\uddf7\ud83c\uddfc"
  },
  {
    "name": "Saint Kitts and Nevis",
    "code": "KN",
    "dial_code": "+1-869",
    "flag": "\ud83c\uddf0\ud83c\uddf3"
  },
  {
    "name": "Saint Lucia",
    "code": "LC",
    "dial_code": "+1-758",
    "flag": "\ud83c\uddf1\ud83c\udde8"
  },
  {
    "name": "Saint Vincent and the Grenadines",
    "code": "VC",
    "dial_code": "+1-784",
    "flag": "\ud83c\uddfb\ud83c\udde8"
  },
  {
    "name": "Samoa",
    "code": "WS",
    "dial_code": "+685",
    "flag": "\ud83c\uddfc\ud83c\uddf8"
  },
  {
    "name": "San Marino",
    "code": "SM",
    "dial_code": "+378",
    "flag": "\ud83c\uddf8\ud83c\uddf2"
  },
  {
    "name": "Sao Tome and Principe",
    "code": "ST",
    "dial_code": "+239",
    "flag": "\ud83c\uddf8\ud83c\uddf9"
  },
  {
    "name": "Saudi Arabia",
    "code": "SA",
    "dial_code": "+966",
    "flag": "\ud83c\uddf8\ud83c\udde6"
  },
  {
    "name": "Senegal",
    "code": "SN",
    "dial_code": "+221",
    "flag": "\ud83c\uddf8\ud83c\uddf3"
  },
  {
    "name": "Serbia",
    "code": "RS",
    "dial_code": "+381",
    "flag": "\ud83c\uddf7\ud83c\uddf8"
  },
  {
    "name": "Seychelles",
    "code": "SC",
    "dial_code": "+248",
    "flag": "\ud83c\uddf8\ud83c\udde8"
  },
  {
    "name": "Sierra Leone",
    "code": "SL",
    "dial_code": "+232",
    "flag": "\ud83c\uddf8\ud83c\uddf1"
  },
  {
    "name": "Singapore",
    "code": "SG",
    "dial_code": "+65",
    "flag": "\ud83c\uddf8\ud83c\uddec"
  },
  {
    "name": "Slovakia",
    "code": "SK",
    "dial_code": "+421",
    "flag": "\ud83c\uddf8\ud83c\uddf0"
  },
  {
    "name": "Slovenia",
    "code": "SI",
    "dial_code": "+386",
    "flag": "\ud83c\uddf8\ud83c\uddee"
  },
  {
    "name": "Solomon Islands",
    "code": "SB",
    "dial_code": "+677",
    "flag": "\ud83c\uddf8\ud83c\udde7"
  },
  {
    "name": "Somalia",
    "code": "SO",
    "dial_code": "+252",
    "flag": "\ud83c\uddf8\ud83c\uddf4"
  },
  {
    "name": "South Africa",
    "code": "ZA",
    "dial_code": "+27",
    "flag": "\ud83c\uddff\ud83c\udde6"
  },
  {
    "name": "South Korea",
    "code": "KR",
    "dial_code": "+82",
    "flag": "\ud83c\uddf0\ud83c\uddf7"
  },
  {
    "name": "South Sudan",
    "code": "SS",
    "dial_code": "+211",
    "flag": "\ud83c\uddf8\ud83c\uddf8"
  },
  {
    "name": "Spain",
    "code": "ES",
    "dial_code": "+34",
    "flag": "\ud83c\uddea\ud83c\uddf8"
  },
  {
    "name": "Sri Lanka",
    "code": "LK",
    "dial_code": "+94",
    "flag": "\ud83c\uddf1\ud83c\uddf0"
  },
  {
    "name": "Sudan",
    "code": "SD",
    "dial_code": "+249",
    "flag": "\ud83c\uddf8\ud83c\udde9"
  },
  {
    "name": "Suriname",
    "code": "SR",
    "dial_code": "+597",
    "flag": "\ud83c\uddf8\ud83c\uddf7"
  },
  {
    "name": "Sweden",
    "code": "SE",
    "dial_code": "+46",
    "flag": "\ud83c\uddf8\ud83c\uddea"
  },
  {
    "name": "Switzerland",
    "code": "CH",
    "dial_code": "+41",
    "flag": "\ud83c\udde8\ud83c\udded"
  },
  {
    "name": "Syria",
    "code": "SY",
    "dial_code": "+963",
    "flag": "\ud83c\uddf8\ud83c\uddfe"
  },
  {
    "name": "Taiwan",
    "code": "TW",
    "dial_code": "+886",
    "flag": "\ud83c\uddf9\ud83c\uddfc"
  },
  {
    "name": "Tajikistan",
    "code": "TJ",
    "dial_code": "+992",
    "flag": "\ud83c\uddf9\ud83c\uddef"
  },
  {
    "name": "Tanzania",
    "code": "TZ",
    "dial_code": "+255",
    "flag": "\ud83c\uddf9\ud83c\uddff"
  },
  {
    "name": "Thailand",
    "code": "TH",
    "dial_code": "+66",
    "flag": "\ud83c\uddf9\ud83c\udded"
  },
  {
    "name": "Timor-Leste",
    "code": "TL",
    "dial_code": "+670",
    "flag": "\ud83c\uddf9\ud83c\uddf1"
  },
  {
    "name": "Togo",
    "code": "TG",
    "dial_code": "+228",
    "flag": "\ud83c\uddf9\ud83c\uddec"
  },
  {
    "name": "Tonga",
    "code": "TO",
    "dial_code": "+676",
    "flag": "\ud83c\uddf9\ud83c\uddf4"
  },
  {
    "name": "Trinidad and Tobago",
    "code": "TT",
    "dial_code": "+1-868",
    "flag": "\ud83c\uddf9\ud83c\uddf9"
  },
  {
    "name": "Tunisia",
    "code": "TN",
    "dial_code": "+216",
    "flag": "\ud83c\uddf9\ud83c\uddf3"
  },
  {
    "name": "Turkey",
    "code": "TR",
    "dial_code": "+90",
    "flag": "\ud83c\uddf9\ud83c\uddf7"
  },
  {
    "name": "Turkmenistan",
    "code": "TM",
    "dial_code": "+993",
    "flag": "\ud83c\uddf9\ud83c\uddf2"
  },
  {
    "name": "Tuvalu",
    "code": "TV",
    "dial_code": "+688",
    "flag": "\ud83c\uddf9\ud83c\uddfb"
  },
  {
    "name": "Uganda",
    "code": "UG",
    "dial_code": "+256",
    "flag": "\ud83c\uddfa\ud83c\uddec"
  },
  {
    "name": "Ukraine",
    "code": "UA",
    "dial_code": "+380",
    "flag": "\ud83c\uddfa\ud83c\udde6"
  },
  {
    "name": "United Arab Emirates",
    "code": "AE",
    "dial_code": "+971",
    "flag": "\ud83c\udde6\ud83c\uddea"
  },
  {
    "name": "United Kingdom",
    "code": "GB",
    "dial_code": "+44",
    "flag": "\ud83c\uddec\ud83c\udde7"
  },
  {
    "name": "United States",
    "code": "US",
    "dial_code": "+1",
    "flag": "\ud83c\uddfa\ud83c\uddf8"
  },
  {
    "name": "Uruguay",
    "code": "UY",
    "dial_code": "+598",
    "flag": "\ud83c\uddfa\ud83c\uddfe"
  },
  {
    "name": "Uzbekistan",
    "code": "UZ",
    "dial_code": "+998",
    "flag": "\ud83c\uddfa\ud83c\uddff"
  },
  {
    "name": "Vanuatu",
    "code": "VU",
    "dial_code": "+678",
    "flag": "\ud83c\uddfb\ud83c\uddfa"
  },
  {
    "name": "Vatican City",
    "code": "VA",
    "dial_code": "+39-06",
    "flag": "\ud83c\uddfb\ud83c\udde6"
  },
  {
    "name": "Venezuela",
    "code": "VE",
    "dial_code": "+58",
    "flag": "\ud83c\uddfb\ud83c\uddea"
  },
  {
    "name": "Vietnam",
    "code": "VN",
    "dial_code": "+84",
    "flag": "\ud83c\uddfb\ud83c\uddf3"
  },
  {
    "name": "Yemen",
    "code": "YE",
    "dial_code": "+967",
    "flag": "\ud83c\uddfe\ud83c\uddea"
  },
  {
    "name": "Zambia",
    "code": "ZM",
    "dial_code": "+260",
    "flag": "\ud83c\uddff\ud83c\uddf2"
  },
  {
    "name": "Zimbabwe",
    "code": "ZW",
    "dial_code": "+263",
    "flag": "\ud83c\uddff\ud83c\uddfc"
  }
];

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onCountryChange?: (countryCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string;
  required?: boolean;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({
    value = "",
    onChange,
    onCountryChange,
    placeholder = "Enter phone number",
    disabled = false,
    className,
    defaultCountry = "+233",
    required = false,
    id,
    onKeyDown,
    ...props
  }, ref) => {
    const [open, setOpen] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState(() => {
      const defaultData = COUNTRY_CODES.find(c => c.dial_code === defaultCountry) || COUNTRY_CODES[0];
      return defaultData.code;
    });
    const selectedCountryData = COUNTRY_CODES.find(c => c.code === selectedCountryCode) || COUNTRY_CODES[0];
    const [phoneNumber, setPhoneNumber] = useState(value.replace(selectedCountryData.dial_code, ""));

    useEffect(() => {
      // If the value starts with the selected country code, strip it for the local state
      if (value.startsWith(selectedCountryData.dial_code)) {
        setPhoneNumber(value.substring(selectedCountryData.dial_code.length));
      } else {
        // Check if it starts with any other country code (longest dial_code first)
        const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.dial_code.length - a.dial_code.length);
        const matchingCountry = sortedCodes.find(c => value.startsWith(c.dial_code));
        if (matchingCountry) {
          setSelectedCountryCode(matchingCountry.code);
          setPhoneNumber(value.substring(matchingCountry.dial_code.length));
        } else {
          setPhoneNumber(value);
        }
      }
    }, [value, selectedCountryData.dial_code]);

    const handleCountryChange = (countryCode: string) => {
      const country = COUNTRY_CODES.find(c => c.code === countryCode);
      if (!country) return;

      setSelectedCountryCode(countryCode);
      onCountryChange?.(country.dial_code);
      setOpen(false);
      
      // Update the full phone number
      const fullNumber = country.dial_code + phoneNumber;
      onChange?.(fullNumber);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setPhoneNumber(inputValue);
      
      // Combine country code with phone number
      const fullNumber = selectedCountryData.dial_code + inputValue;
      onChange?.(fullNumber);
    };

    return (
      <div className={cn("flex rounded-md border border-input bg-background overflow-hidden", className)}>
        {/* Country Code Selector (Searchable Popover) */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild disabled={disabled}>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="h-full px-3 border-0 border-r rounded-none bg-muted/30 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 flex items-center gap-2"
            >
              <span className="text-lg leading-none">{selectedCountryData.flag}</span>
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                {selectedCountryData.dial_code}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country or code..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRY_CODES.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={country.name + " " + country.dial_code}
                      onSelect={() => handleCountryChange(country.code)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCountryCode === country.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="mr-2 text-lg">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">{country.dial_code}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <Input
          ref={ref}
          id={id}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 h-full"
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
