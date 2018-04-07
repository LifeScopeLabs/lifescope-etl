/* @flow */

import deepEqual from 'deep-equal';

import crudSchema from './crud-schema';
// import sessionSchema from './session-schema';

const queries = [
    {
      title: 'Find by id',
      query: `
{
  userById(_id: "57bb44dd21d2befb7ca3f010") {
    _id
    name
    languages {
      language
      skill
    }
    contacts {
      email
    }
    gender
    age
  }
}
      `,
    },
    {
      title: 'Find one User',
      query: `
{
  userOne(filter: { age: 18 }, sort: _ID_ASC) {
    name
    languages {
      language
      skill
    }
    contacts {
      email
    }
    gender
    age
  }
}
      `,
    },
    {
      title: 'Find many Users',
      query: `
{
  userMany(filter: { gender: male }, limit: 5, sort: _ID_ASC) {
    name
    languages {
      language
      skill
    }
    contacts {
      email
    }
    gender
    age
  }
}
      `,
    },
    {
      title: 'Find many Users (by geo distance)',
      query: `
{
  distance_5_km: userMany(filter: {
    geoDistance: {
      lng: 76.911982,
      lat: 43.233893,
      distance: 5000,
    }
  }) {
    name
    address {
      geo
    }
  }
  distance_100_km: userMany(filter: {
    geoDistance: {
      lng: 76.911982,
      lat: 43.233893,
      distance: 100000,
    }
  }) {
    name
    address {
      geo
    }
  }
}
      `,
    },
    {
      title: 'Find User with field of MIXED type',
      query: `
{
  userById(_id: "57bb44dd21d2befb7ca3f001") {
    _id
    name
    someMixed
  }
}
      `,
    },
    {
      title: 'Create user mutation (with arg of MIXED type)',
      query: `
mutation {
  userCreate(record: {
    name: "My Name",
    age: 24,
    gender: ladyboy,
    contacts: {
      email: "mail@example.com",
      phones: [
        "111-222-333-444",
        "444-555-666-777"
      ]
    },
    someMixed: {
      a: 1,
      b: 2,
      c: [ 1, 2, 3, true, false, { sub: 1 }]
    }
  }) {
    recordId
    record {
      name
      age
      gender
      contacts {
        email
        phones
      }
      someMixed
    }
  }
}
      `,
    },
    {
      title: 'Pagination',
      query: `
{
  userPagination(filter: { gender: male }, perPage: 2, page: 2, sort: _ID_ASC) {
    items {
      name
      languages {
        language
        skill
      }
      contacts {
        email
      }
      gender
      age
    }
    count
    pageInfo {
      currentPage
      perPage
      itemCount
      pageCount
      hasPreviousPage
      hasNextPage
    }
  }
}
      `,
    },
  ]


// export default {
//   uri: '/gql',
//   schema: crudSchema,
//   title: 'LifeScope GraphQL API',
//   description:
//     'This schema implements all data collected, organized, and analyzed by the LifeScope platform',
//   github: 'https://github.com/bitscooplabs/lifescope',
//   queries: queries,
// };

export const crudAPI = {
  uri: '/gql',
  schema: crudSchema,
  title: 'LifeScope GraphQL API',
  description:
    'This schema implements all data collected, organized, and analyzed by the LifeScope platform',
  github: 'https://github.com/bitscooplabs/lifescope',
  queries: queries,
};

// export const sessionAPI = {
//   uri: '/session',
//   sessionSchema,
//   title: 'LifeScope Session API'
// };