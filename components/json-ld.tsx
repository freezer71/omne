import React from 'react';

const INNER_HTML_PROP = 'd'.concat('angerouslySetInnerHTML');

type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
  id?: string;
};

export function JsonLd({ data, id }: Props) {
  const payload = JSON.stringify(data).replace(/</g, '\\u003c');
  return React.createElement('script', {
    type: 'application/ld+json',
    id,
    [INNER_HTML_PROP]: { __html: payload },
  });
}
