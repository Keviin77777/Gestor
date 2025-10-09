import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('Authorization');
    
    // Check if this is a preview request
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    let url: string;
    if (action === 'preview') {
      // Use path-based routing for preview
      url = `${API_BASE_URL}/whatsapp-reminder-templates/${id}/preview`;
    } else {
      url = `${API_BASE_URL}/whatsapp-reminder-templates/${id}`;
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    console.log('Fetching template from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      console.error('Request URL:', url);
      return NextResponse.json(
        { error: 'Failed to fetch reminder template', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching reminder template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminder template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;
    const authHeader = request.headers.get('Authorization');
    
    console.log('PUT request to template:', id);
    console.log('Request body:', body);
    console.log('Auth header present:', !!authHeader);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const url = `${API_BASE_URL}/whatsapp-reminder-templates/${id}`;
    console.log('Calling PHP API:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    console.log('PHP API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PHP API error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to update reminder template', details: errorText, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Template updated successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT handler:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('Authorization');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(`${API_BASE_URL}/whatsapp-reminder-templates/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting reminder template:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder template' },
      { status: 500 }
    );
  }
}